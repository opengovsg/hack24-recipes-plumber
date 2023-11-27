import { useEffect, useRef } from 'react'
import { Flex } from '@chakra-ui/react'
import { HeaderContext } from '@tanstack/react-table'

import { Z_INDEX_CELL } from '../../constants'
import { GenericRowData } from '../../types'

export default function CheckboxHeaderCell({
  table,
}: HeaderContext<GenericRowData, unknown>) {
  const isAllRowsSelected = table.getIsAllRowsSelected()
  const isSomeRowsSelected = table.getIsSomeRowsSelected()
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = isSomeRowsSelected
    }
  }, [isSomeRowsSelected])

  return (
    <Flex
      as="label"
      w={'40px'}
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      position="sticky"
      left={0}
      background="primary.700"
      zIndex={Z_INDEX_CELL.CHECKBOX}
      borderRightWidth={'0.5px'}
      borderColor="primary.400"
    >
      <input
        ref={ref}
        style={{
          cursor: 'pointer',
          accentColor: 'var(--chakra-colors-primary-500)',
        }}
        type="checkbox"
        checked={isAllRowsSelected}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    </Flex>
  )
}