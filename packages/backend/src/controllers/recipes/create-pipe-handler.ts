import type { IJSONObject } from '@plumber/types'

import type { RequestHandler } from 'express'
import type { PartialModelObject } from 'objection'
import z from 'zod'

import apps from '@/apps'
import registerConnection from '@/graphql/mutations/register-connection'
import verifyConnection from '@/graphql/mutations/verify-connection'
import { getOrCreateUser } from '@/helpers/auth'
import { validateAndParseEmail } from '@/helpers/email-validator'
import type Step from '@/models/step'
import type User from '@/models/user'

const APP_KEYS: ReadonlySet<string> = new Set(
  Object.values(apps).map((app) => app.key),
)

// Intentionally no validation
const jsonObjectSchema = z.custom<IJSONObject>()

const pipeStepSchema = z
  .object({
    type: z.enum(['trigger', 'action']),
    app: z.string().refine(function (appKey) {
      return APP_KEYS.has(appKey)
    }),
    event: z.string().min(1),
    connection: z
      .discriminatedUnion('command', [
        z.object({ command: z.literal('create'), data: jsonObjectSchema }),
        z.object({
          command: z.literal('reuse-earlier-step'),
          position: z.number().gt(1),
        }),
      ])
      .nullish(),
    parameters: jsonObjectSchema,
  })
  // Some cursory validation...
  .refine(function (schema) {
    const selectedApp = apps[schema.app]

    // Technically can compute trigger/action keys outside but lazy to do.
    if (
      schema.type === 'trigger' &&
      !selectedApp.triggers.map((trigger) => trigger.key).includes(schema.event)
    ) {
      return false
    }

    if (
      schema.type === 'action' &&
      !selectedApp.actions.map((action) => action.key).includes(schema.event)
    ) {
      return false
    }

    // AuthUrl apps not supported for now
    if (selectedApp.auth?.generateAuthUrl) {
      return false
    }

    return true
  })

const paramsSchema = z.object({
  userEmail: z.string().email().min(1),
  pipeName: z.string().min(1),
  pipeSteps: z
    .array(pipeStepSchema)
    .min(2) // Need trigger + at least 1 action
    .superRefine(function (steps, context) {
      if (steps[0].type !== 'trigger') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'First step must be trigger',
          fatal: true,
        })

        return z.NEVER
      }

      for (const actionStep of steps.slice(1)) {
        if (actionStep.type !== 'action') {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Must only have action steps after trigger step',
            fatal: true,
          })
        }
      }
    }),
})

async function createConnection(
  user: User,
  step: Step,
  connectionConfig: IJSONObject,
): Promise<string | null> {
  const app = apps[step.appKey]

  // Should not happen but doesn't hurt.
  if (!app.auth) {
    return null
  }

  const connection = await user.$relatedQuery('connections').insert({
    key: step.appKey,
    formattedData: connectionConfig,
  })

  await verifyConnection(
    null,
    {
      input: {
        id: connection.id,
      },
    },
    {
      currentUser: user,
      // any good for hackathon.
    } as any,
  )

  // Registration needs connection IDs to be updated in steps, so might as well
  // do it now. There's probably a better-optimized sequence to do connection
  // creation + step creation + connection registration, but hackathon so wdv.
  await step.$query().patch({
    connectionId: connection.id,
  })

  // If needs registration, re-use our mutation to perform registration.
  if (app.auth.connectionRegistrationType) {
    await registerConnection(
      null,
      {
        input: {
          connectionId: connection.id,
          stepId: step.id,
        },
      },
      {
        currentUser: user,
        // any good for hackathon.
      } as any,
    )
  }

  return connection.id
}

async function setupStepConnections(
  user: User,
  stepsToSetup: Array<{
    step: Step
    connection: z.infer<typeof paramsSchema>['pipeSteps'][number]['connection']
  }>,
): Promise<void> {
  const connectionsThusFar: string[] = []

  for (const stepToSetup of stepsToSetup) {
    if (!stepToSetup.connection) {
      await stepToSetup.step.$query().patch({
        status: 'completed',
      })
      connectionsThusFar.push(null)
      continue
    }

    // REFACTOR LATER. Not supposed to be serial await but wdv.
    switch (stepToSetup.connection.command) {
      case 'reuse-earlier-step': {
        const connectionId =
          connectionsThusFar[stepToSetup.connection.position - 1]
        connectionsThusFar.push(connectionId)
        break
      }

      case 'create': {
        const connectionId = await createConnection(
          user,
          stepToSetup.step,
          stepToSetup.connection.data,
        )
        connectionsThusFar.push(connectionId)
        break
      }
    }

    await stepToSetup.step.$query().patch({
      status: 'completed',
    })
  }
}

const STEP_VAR_REGEX = /({{step\.[\d]+(?:\.[\da-zA-Z-_]+)+}})/g

const createPipeHandler: RequestHandler = async function (req, res) {
  const params = paramsSchema.parse(req.body)

  // Create user if doesn't already exist.
  const email = await validateAndParseEmail(params.userEmail)
  if (!email) {
    throw new Error('Email is invalid or not whitelisted.')
  }
  const user = await getOrCreateUser(email)

  //
  // Setup pipe.
  //
  // In theory we could re-use our GraphQL but it's more efficient to skip all
  // that validation.

  const pipe = await user.$relatedQuery('flows').insert({
    name: params.pipeName,
  })

  // Need to create steps first since some connections need step ID.
  const steps = await pipe.$relatedQuery('steps').insert(
    params.pipeSteps.map(
      (step, index): PartialModelObject<Step> => ({
        type: step.type,
        position: index + 1,
        appKey: step.app,
        key: step.event,
      }),
    ),
  )

  // ***
  // MAX JANX - support variables in steps by jank parsing.
  // **
  //
  // DANGEROUS IN PROD COS BAD COMPLEXITY.
  // HI HACKATHON.
  for (const [i, stepConfig] of params.pipeSteps.entries()) {
    if (!stepConfig.parameters) {
      continue
    }

    // I'M SORRY
    const rawStringifiedParams = JSON.stringify(stepConfig.parameters)
    const splitResults = rawStringifiedParams.split(STEP_VAR_REGEX)

    if (splitResults.length === 1) {
      steps[i] = await steps[i].$query().patchAndFetch({
        parameters: stepConfig.parameters,
      })
      continue
    }

    const processedStringifiedParamsBits: string[] = []

    for (const splitResult of splitResults) {
      if (!STEP_VAR_REGEX.test(splitResult)) {
        processedStringifiedParamsBits.push(splitResult)
        continue
      }

      // Replace 2nd part of step with actual step ID.
      // e.g. {{step.0.answer}} -> {{step.abcd-1234.answer}}
      const atoms = splitResult.split('.')
      atoms[1] = steps[Number(atoms[1])].id
      processedStringifiedParamsBits.push(atoms.join('.'))
    }

    steps[i] = await steps[i].$query().patchAndFetch({
      parameters: JSON.parse(processedStringifiedParamsBits.join('')),
    })
  }

  // Create connections where needed.
  await setupStepConnections(
    user,
    // Ghetto zip
    params.pipeSteps.map((s, index) => ({
      step: steps[index],
      connection: s.connection,
    })),
  )

  // Publish!
  await pipe.$query().patch({ active: true })

  res.json({ pipeId: pipe.id })
}

export default createPipeHandler
