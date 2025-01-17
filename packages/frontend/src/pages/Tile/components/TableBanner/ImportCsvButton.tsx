import { ITableColumnMetadata, ITableMetadata } from '@plumber/types'

import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import { BsCheckCircle, BsFiletypeCsv, BsPlusCircleFill } from 'react-icons/bs'
import { useLazyQuery, useMutation } from '@apollo/client'
import {
  Card,
  Flex,
  List,
  ListIcon,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { Attachment, Button, Spinner } from '@opengovsg/design-system-react'
import { CREATE_ROWS } from 'graphql/mutations/create-rows'
import { GET_ALL_ROWS } from 'graphql/queries/get-all-rows'
import { GET_TABLE } from 'graphql/queries/get-table'
import { chunk } from 'lodash'
import Papa, { ParseMeta, ParseResult } from 'papaparse'
import { SetRequired } from 'type-fest'

import { useTableContext } from '../../contexts/TableContext'
import { useUpdateTable } from '../../hooks/useUpdateTable'

interface ValidParseResult extends ParseResult<Record<string, string>> {
  meta: SetRequired<ParseMeta, 'fields'>
}

// 2 MB in bytes
const MAX_FILE_SIZE = 2 * 1000 * 1000
// Add row chunk size
const CHUNK_SIZE = 100

const ImportCsvModal = ({ onClose }: { onClose: () => void }) => {
  const { tableId, tableColumns } = useTableContext()

  const { createColumns } = useUpdateTable()
  const [createRows] = useMutation(CREATE_ROWS)
  const [getTableData] = useLazyQuery<{
    getTable: ITableMetadata
  }>(GET_TABLE, {
    variables: {
      tableId,
    },
  })

  const columnNamesSet = useMemo(
    () => new Set(tableColumns.map((column) => column.name)),
    [tableColumns],
  )

  const [importStatus, setImportStatus] = useState<
    'ready' | 'importing' | 'completed' | 'error'
  >('ready')
  const [importingMsg, setImportingMsg] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState<ValidParseResult | null>(null)
  const [columnsToCreate, setColumnsToCreate] = useState<string[]>([])

  const [file, setFile] = useState<File>()

  const isValidParseResult = useCallback(
    (parseResult: ParseResult<unknown>): parseResult is ValidParseResult => {
      return (
        !!parseResult.meta.fields &&
        parseResult.meta.fields.length > 0 &&
        parseResult.data.length > 0
      )
    },
    [],
  )

  useEffect(() => {
    if (!file) {
      setIsParsing(false)
      setResult(null)
      setImportStatus('ready')
      setImportingMsg('')
      return
    }
    setIsParsing(true)
    Papa.parse(file, {
      transformHeader: (header) => header.trim(),
      header: true,
      skipEmptyLines: true,
      complete: (parseResult) => {
        setIsParsing(false)
        if (isValidParseResult(parseResult)) {
          setResult(parseResult)
          const columns = parseResult.meta.fields
          setColumnsToCreate(
            columns.filter((csvColumn) => !columnNamesSet.has(csvColumn)),
          )
        }
      },
    })
  }, [columnNamesSet, file, isValidParseResult])

  const createNewColumns = useCallback(async () => {
    await createColumns(columnsToCreate)
    const { data: updatedTableData } = await getTableData()
    if (!updatedTableData) {
      throw new Error('Unable to fetch updated table data')
    }
    return updatedTableData.getTable.columns
  }, [columnsToCreate, createColumns, getTableData])

  const mapDataToColumnIds = useCallback(
    (
      allColumns: ITableColumnMetadata[],
      data: Record<string, string>[],
    ): Record<string, string>[] => {
      const columnNameToIdMap: Record<string, string> = {}
      allColumns.forEach(({ name, id }) => {
        columnNameToIdMap[name] = id
      })
      return data.map((row) => {
        const mappedRow: Record<string, string> = {}
        for (const [key, value] of Object.entries(row)) {
          const columnId = columnNameToIdMap[key]
          if (!columnId) {
            throw new Error('Column not found')
          }
          mappedRow[columnId] = value
        }
        return mappedRow
      })
    },
    [],
  )

  const onImport = useCallback(async () => {
    if (!result) {
      return
    }
    try {
      setImportStatus('importing')
      let allColumns = tableColumns
      if (columnsToCreate.length > 0) {
        setImportingMsg('Creating columns')
        allColumns = await createNewColumns()
      }
      const mappedData = mapDataToColumnIds(allColumns, result.data)
      setImportingMsg(`Adding rows (0/${mappedData.length})`)
      const chunkedData = chunk(mappedData, CHUNK_SIZE)

      for (let i = 0; i < chunkedData.length; i++) {
        await createRows({
          variables: {
            input: {
              tableId,
              dataArray: chunkedData[i],
            },
          },
          refetchQueries:
            i === chunkedData.length - 1 ? [GET_ALL_ROWS] : undefined,
          awaitRefetchQueries: true,
        })
        setImportingMsg(
          `Adding rows (${(i + 1) * CHUNK_SIZE}/${mappedData.length})`,
        )
      }
      setImportStatus('completed')
      setImportingMsg(`Done: ${mappedData.length} rows added`)
    } catch (e) {
      setImportStatus('error')
      setImportingMsg(`Error: ${(e as Error).message}`)
    }
  }, [
    columnsToCreate.length,
    createNewColumns,
    createRows,
    mapDataToColumnIds,
    result,
    tableColumns,
    tableId,
  ])

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      closeOnOverlayClick={!importStatus}
      motionPreset="none"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text textStyle="h6">Import CSV</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Attachment
            maxSize={MAX_FILE_SIZE}
            onChange={setFile}
            title="Upload CSV"
            name="file-upload"
            showFileSize={true}
            accept={{ 'text/csv': ['.csv'] }}
            isDisabled={importStatus === 'importing'}
            value={file}
          />
          {file && (
            <Card p={4} mt={2}>
              {isParsing && (
                <Flex>
                  <Spinner mr={2} color="primary.600" />
                  Parsing file...
                </Flex>
              )}
              {result && (
                <>
                  <Text textStyle="subhead-1">
                    {result.meta.fields.length} columns found
                    {columnsToCreate.length > 0 && (
                      <Text as="span" ml={1} color="primary.600">
                        ({columnsToCreate.length} columns will be added)
                      </Text>
                    )}
                  </Text>
                  <List spacing={3} mt={2}>
                    {result.meta.fields.map((field, i) => {
                      return (
                        <Flex key={i} alignItems="center">
                          <ListIcon
                            as={
                              columnNamesSet.has(field)
                                ? BsCheckCircle
                                : BsPlusCircleFill
                            }
                            color={
                              columnNamesSet.has(field)
                                ? 'green.500'
                                : 'primary.500'
                            }
                          />
                          <ListItem>{field}</ListItem>
                        </Flex>
                      )
                    })}
                  </List>
                </>
              )}
              {}
            </Card>
          )}
        </ModalBody>

        <ModalFooter justifyContent="space-between">
          {result && (
            <>
              <Text>{importingMsg}</Text>
              <Button
                isLoading={importStatus === 'importing'}
                onClick={importStatus === 'completed' ? onClose : onImport}
              >
                {importStatus === 'completed'
                  ? 'Done'
                  : `Import ${result.data.length} rows`}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

const ImportCsvButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Button
        ref={ref}
        variant="clear"
        colorScheme="secondary"
        size="xs"
        onClick={onOpen}
        leftIcon={<BsFiletypeCsv size={16} />}
      >
        CSV
      </Button>
      {/* unmount component when closed to reset all state */}
      {isOpen && <ImportCsvModal onClose={onClose} />}
    </>
  )
})

export default ImportCsvButton
