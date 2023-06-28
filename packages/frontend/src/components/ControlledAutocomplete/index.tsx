import type { IFieldDropdownOption } from '@plumber/types'

import * as React from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Flex } from '@chakra-ui/react'
import RefreshIcon from '@mui/icons-material/Refresh'
import Autocomplete, {
  AutocompleteProps,
  createFilterOptions,
} from '@mui/material/Autocomplete'
import FormHelperText from '@mui/material/FormHelperText'
import Typography from '@mui/material/Typography'
import { IconButton } from '@opengovsg/design-system-react'

interface ControlledAutocompleteProps
  extends AutocompleteProps<IFieldDropdownOption, boolean, boolean, boolean> {
  shouldUnregister?: boolean
  name: string
  required?: boolean
  showOptionValue?: boolean
  description?: string
  dependsOn?: string[]
  onRefresh?: () => void
}

const filter = createFilterOptions<IFieldDropdownOption>()

const getOption = (
  options: readonly IFieldDropdownOption[],
  value: string,
  freeSolo?: boolean,
) => {
  const foundOption = options.find((option) => option.value === value)
  if (foundOption) {
    return foundOption
  }
  // If allowArbitrary is true, return the value as the option
  if (freeSolo) {
    return value
  }
  return null
}

function ControlledAutocomplete(
  props: ControlledAutocompleteProps,
): React.ReactElement {
  const { control, watch, setValue, resetField } = useFormContext()

  const {
    required = false,
    name,
    defaultValue,
    shouldUnregister,
    description,
    options = [],
    dependsOn = [],
    showOptionValue,
    freeSolo,
    onRefresh,
    loading,
    ...autocompleteProps
  } = props

  let dependsOnValues: unknown[] = []
  if (dependsOn?.length) {
    dependsOnValues = watch(dependsOn)
  }

  React.useEffect(() => {
    const hasDependencies = dependsOnValues.length
    const allDepsSatisfied = dependsOnValues.every(Boolean)

    if (hasDependencies && !allDepsSatisfied) {
      // Reset the field if any dependency is not satisfied
      setValue(name, null)
      resetField(name)
    }
  }, dependsOnValues)

  return (
    <Controller
      rules={{ required }}
      name={name}
      defaultValue={defaultValue || ''}
      control={control}
      shouldUnregister={shouldUnregister}
      render={({ field: { ref, onChange, onBlur, ...field }, fieldState }) => (
        <div>
          {/* encapsulated with an element such as div to vertical spacing delegated from parent */}
          <Flex alignItems="center" gap={2}>
            <Autocomplete
              {...autocompleteProps}
              {...field}
              freeSolo={freeSolo}
              options={options}
              value={getOption(options, field.value, freeSolo)}
              onChange={(_event, selectedOption) => {
                const typedSelectedOption =
                  selectedOption as IFieldDropdownOption
                if (
                  typedSelectedOption !== null &&
                  Object.prototype.hasOwnProperty.call(
                    typedSelectedOption,
                    'value',
                  )
                ) {
                  onChange(typedSelectedOption.value)
                  return
                }
                // manual input
                onChange(typedSelectedOption)
              }}
              onBlur={onBlur}
              clearOnBlur
              filterOptions={(options, params) => {
                const filtered = filter(options, params)

                if (params.inputValue !== '') {
                  filtered.push({
                    value: params.inputValue,
                    label: `Use: ${params.inputValue}`,
                  })
                }

                return filtered
              }}
              ref={ref}
              data-test={`${name}-autocomplete`}
              getOptionLabel={(option) => {
                // manual input
                if (typeof option === 'string') {
                  return option
                }
                if (option.label) {
                  return option.label
                }
                return option.value?.toString() || ''
              }}
              renderOption={(optionProps, option) => (
                <li
                  {...optionProps}
                  key={option.value.toString()}
                  style={{ flexDirection: 'column', alignItems: 'start' }}
                >
                  <Typography>{option.label}</Typography>

                  {showOptionValue && (
                    <Typography variant="caption">{option.value}</Typography>
                  )}
                </li>
              )}
            />
            {onRefresh && (
              <IconButton
                aria-label="refresh"
                variant="clear"
                isLoading={loading}
                icon={<RefreshIcon />}
                onClick={onRefresh}
                rounded="50%"
              />
            )}
          </Flex>
          <FormHelperText
            variant="outlined"
            error={Boolean(fieldState.isTouched && fieldState.error)}
          >
            {fieldState.isTouched
              ? fieldState.error?.message || description
              : description}
          </FormHelperText>
        </div>
      )}
    />
  )
}

export default ControlledAutocomplete
