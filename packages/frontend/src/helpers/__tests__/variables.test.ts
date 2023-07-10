import { IStep } from '@plumber/types'

import { extractVariables } from 'helpers/variables'
import { beforeEach, describe, expect, it } from 'vitest'

describe('variables', () => {
  describe('extractVariables', () => {
    let steps: IStep[]

    beforeEach(() => {
      steps = [
        {
          id: 'step1-id',
          appKey: 'app1',
          executionSteps: [
            {
              dataOut: {
                stringProp: 'string value',
              },
            },
          ],
        },
      ] as unknown as IStep[]
    })

    it('extracts variables from every step', () => {
      steps.push({
        id: 'step2-id',
        appKey: 'app2',
        executionSteps: [
          {
            dataOut: {
              numberProp: 456,
            },
          },
        ],
      } as unknown as IStep)

      const result = extractVariables(steps)
      expect(result).toEqual([
        {
          id: 'step1-id',
          name: '1. App1',
          output: [
            // Use objectContaining to avoid enumerating all metadata props
            expect.objectContaining({
              name: 'step.step1-id.stringProp',
              value: 'string value',
            }),
          ],
        },
        {
          id: 'step2-id',
          name: '2. App2',
          output: [
            expect.objectContaining({
              name: 'step.step2-id.numberProp',
              value: 456,
            }),
          ],
        },
      ])
    })

    describe('extracts variables from complex thingys', () => {
      it('handles nested objects', () => {
        steps[0].executionSteps[0].dataOut.objectProp = {
          a: 1,
          b: 'str-2',
        }

        const result = extractVariables(steps)
        expect(result[0].output).toEqual([
          expect.objectContaining({
            name: 'step.step1-id.stringProp',
            value: 'string value',
          }),
          expect.objectContaining({
            name: 'step.step1-id.objectProp.a',
            value: 1,
          }),
          expect.objectContaining({
            name: 'step.step1-id.objectProp.b',
            value: 'str-2',
          }),
        ])
      })

      it('handles arrays', () => {
        steps[0].executionSteps[0].dataOut.arrayProp = [
          9000,
          'HI THAR',
          { c: '1', d: 2 },
        ]

        const result = extractVariables(steps)
        expect(result[0].output).toEqual([
          expect.objectContaining({
            name: 'step.step1-id.stringProp',
            value: 'string value',
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.0',
            label: null,
            value: 9000,
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.1',
            label: null,
            value: 'HI THAR',
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.2.c',
            label: null,
            value: '1',
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.2.d',
            label: null,
            value: 2,
          }),
        ])
      })
    })

    // Sanity check with label metadatum only; hence the use of objectContaining
    describe('adds metadata to all prop types', () => {
      it('adds to primitive props', () => {
        steps[0].executionSteps[0].dataOutMetadata = {
          stringProp: {
            label: 'test label',
          },
        }
        const result = extractVariables(steps)
        expect(result[0].output[0]).toEqual(
          expect.objectContaining({
            name: 'step.step1-id.stringProp',
            label: 'test label',
            value: 'string value',
          }),
        )
      })

      it('adds to nested object props', () => {
        steps[0].executionSteps[0].dataOut = {
          objectProp: {
            a: 1,
            b: 'stringy 2',
          },
        }
        steps[0].executionSteps[0].dataOutMetadata = {
          objectProp: {
            a: { label: 'label a' },
            b: { label: 'label b' },
          },
        }
        const result = extractVariables(steps)
        expect(result[0].output).toEqual([
          expect.objectContaining({
            name: 'step.step1-id.objectProp.a',
            label: 'label a',
            value: 1,
          }),
          expect.objectContaining({
            name: 'step.step1-id.objectProp.b',
            label: 'label b',
            value: 'stringy 2',
          }),
        ])
      })

      it('adds to array props', () => {
        steps[0].executionSteps[0].dataOut = {
          arrayProp: [9000, 'HI THAR', { c: '1', d: 2 }],
        }
        steps[0].executionSteps[0].dataOutMetadata = {
          arrayProp: [
            { label: 'label 9000' },
            { label: 'label HI THAR' },
            { c: { label: 'label c prop' }, d: { label: 'label d prop' } },
          ],
        }
        const result = extractVariables(steps)
        expect(result[0].output).toEqual([
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.0',
            label: 'label 9000',
            value: 9000,
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.1',
            label: 'label HI THAR',
            value: 'HI THAR',
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.2.c',
            label: 'label c prop',
            value: '1',
          }),
          expect.objectContaining({
            name: 'step.step1-id.arrayProp.2.d',
            label: 'label d prop',
            value: 2,
          }),
        ])
      })
    })

    describe('processes label metadata', () => {
      it('adds label metadata if present', () => {
        steps[0].executionSteps[0].dataOutMetadata = {
          stringProp: {
            label: 'test label',
          },
        }
        const result = extractVariables(steps)
        expect(result[0].output[0]).toEqual(
          expect.objectContaining({
            label: 'test label',
          }),
        )
      })

      it('sets label prop to null if absent', () => {
        const result = extractVariables(steps)
        expect(result[0].output[0]).toEqual(
          expect.objectContaining({
            label: null,
          }),
        )
      })
    })
  })
})