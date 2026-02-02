import React, { useState } from 'react'
import { Loading } from '../shared'

import { RFQAttachmentType } from '@/@types/app'
import ApiService from '@/services/ApiService'
import CustomDrawer from '@/components/app/CustomDrawer'
import { Button, Input, Table } from '@/components/ui'
import formatFileSize from '@/utils/formatFileSize'

import { MdAdd, MdOutlineFileDownload, MdOutlineOpenInNew } from 'react-icons/md'
import { Field, FormikHelpers } from 'formik'
import { RiResetLeftLine } from 'react-icons/ri'
import { IoMdClose } from 'react-icons/io'
import { v4 } from 'uuid'
import { Link } from 'react-router-dom'
import appConfig from '@/configs/app.config'

const { Tr, Th, Td, THead, TBody } = Table

let fileIndex: number
interface AttachmentsTableProps<T> {
    isSmall?: boolean
    isEditable?: boolean
    isDisabled?: boolean
    id: string
    info?: string
    attachments: RFQAttachmentType[]
    setValues?: FormikHelpers<T>['setValues']
}

export function AttachmentsTable<T>({ isEditable, isSmall, isDisabled, id, info, attachments, setValues }: AttachmentsTableProps<T>) {
    const invokeFileInput = (index?: number) => {
        if (index !== undefined && index >= 0) fileIndex = index
        document.getElementById(`file-input:` + id)?.click()
    }

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        let _file = e.target.files?.[0]
        if (!_file) return

        const originalFileName = _file.name

        _file = new File([_file], `${v4()}-${Date.now()}.${_file.name.split('.').pop()}`, { type: _file.type })

        const index = fileIndex

        if (index >= 0) {
            setValues?.((prev) => ({
                ...prev,
                file: (index === 0 ? [] : prev.file?.slice(0, index)).concat(_file).concat(prev.file.slice(index + 1)),
                attachments: (index === 0 ? [] : prev.attachments?.slice(0, index))
                    .concat({
                        file: _file.name,
                        description: originalFileName,
                        size: +(_file.size / 1000).toFixed(2),
                    })
                    .concat(prev.attachments?.slice(index + 1)),
            }))

            fileIndex = -1
        } else {
            setValues?.((prev) => ({
                ...prev,
                file: (prev.file || [])?.concat(_file),
                attachments: (prev.attachments || []).concat({
                    file: _file.name,
                    description: originalFileName,
                    size: +(_file.size / 1000).toFixed(2),
                }),
            }))
        }
    }

    let renderIdx = 0

    return (
        <>
            {isEditable && !isDisabled ? (
                <input hidden type='file' accept='image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' id={'file-input:' + id} onChange={onFileSelect} />
            ) : null}

            <Table compact className='text-xs' containerClassName='w-full'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th>#</Th>
                        <Th className='whitespace-nowrap flex-1'>{[isEditable ? 'Selected' : info, 'Description'].filter(Boolean).join(' — ')}</Th>
                        <Th>Size</Th>
                        <Th className='py-0 w-fit'>
                            <div className='flex items-center w-fit gap-2'>
                                Action
                                {isEditable && !isDisabled ? (
                                    <Button
                                        disabled={isDisabled}
                                        type='button'
                                        variant='solid'
                                        size='xs'
                                        icon={<MdAdd size={13} />}
                                        className='mx-auto block py-1 h-auto !px-1.5'
                                        onClick={() => invokeFileInput()}>
                                        <span className='text-[10px]'>Add</span>
                                    </Button>
                                ) : null}
                            </div>
                        </Th>
                    </Tr>
                </THead>
                <TBody>
                    {attachments?.length > 0 &&
                        attachments?.map((i, index) =>
                            (isEditable && i.status !== 1) || (!isEditable && i.status === 1) ? (
                                <Tr key={`attachment:${id}:${index}`}>
                                    <Td>{++renderIdx}.</Td>
                                    <Td>
                                        {isEditable ? (
                                            <Field
                                                type='text'
                                                size={'sm'}
                                                name={`attachments[${index}].description`}
                                                className='h-auto p-0 border-none outline-none ring-0 rounded-none'
                                                component={Input}
                                            />
                                        ) : (
                                            i.description
                                        )}
                                    </Td>
                                    <Td className='whitespace-nowrap'>{formatFileSize(i.size)}</Td>
                                    <Td>
                                        {isEditable ? (
                                            <div className='flex gap-2'>
                                                <Button
                                                    type='button'
                                                    size='xs'
                                                    variant='twoTone'
                                                    className='rounded-full'
                                                    icon={<RiResetLeftLine size={17} />}
                                                    onClick={() => invokeFileInput(index)}
                                                />
                                                <Button
                                                    type='button'
                                                    size='xs'
                                                    variant='twoTone'
                                                    color='red'
                                                    className='rounded-full'
                                                    icon={<IoMdClose size={17} />}
                                                    onClick={() =>
                                                        setValues?.((prev) => ({
                                                            ...prev,
                                                            attachments: prev.attachments?.slice(0, index).concat(prev.attachments?.slice(index + 1)),
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ) : (
                                            <div className='flex gap-2'>
                                                <Link to={`${appConfig.apiPrefix}/file/download/${id}/${i.file}`}>
                                                    <Button type='button' size='xs' variant='twoTone' icon={<MdOutlineFileDownload />}>
                                                        {!isSmall && 'Download'}
                                                    </Button>
                                                </Link>
                                                <Link to={`${appConfig.apiPrefix}/file/${id}/${i.file}`} target='_blank'>
                                                    <Button type='button' size='xs' variant='twoTone' icon={<MdOutlineOpenInNew />}>
                                                        {!isSmall && 'Open'}
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </Td>
                                </Tr>
                            ) : null,
                        )}

                    {!renderIdx && (
                        <Tr>
                            <Td colSpan={4}>
                                <span className='block my-1 text-center text-slate-400 text-italic'>No Attachments</span>
                            </Td>
                        </Tr>
                    )}
                </TBody>
            </Table>
        </>
    )
}

export const AttachmentsDrawer = ({ id, url, title }: { id: string; url: string; title: string }) => {
    const [attachments, setAttachments] = useState<RFQAttachmentType[]>([])
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        if (!url) return
        if (!attachments?.length) {
            setLoading(true)
            try {
                const itemsResponse = await ApiService.fetchData<RFQAttachmentType[]>({
                    method: 'get',
                    url: url,
                })

                setAttachments(itemsResponse.data)
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }
    }

    return (
        <CustomDrawer title={title} placement='bottom' fetchData={fetchData}>
            <Loading loading={loading}>
                <AttachmentsTable id={id} attachments={attachments || []} />
            </Loading>
        </CustomDrawer>
    )
}
