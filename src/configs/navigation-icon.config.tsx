import {
    HiOutlineDocumentText,
    HiOutlineDocumentReport,
    HiOutlineDatabase,
    HiOutlineScale,
    HiShieldCheck,
    HiOutlineLockClosed,
    HiOutlineHome,
    HiOutlineCash,
} from 'react-icons/hi'
import type { JSX } from 'react'
import { HiOutlineDocumentCurrencyRupee } from 'react-icons/hi2'
import { BiReceipt } from 'react-icons/bi'
import { LuFileUser } from 'react-icons/lu'
import { TbFileDatabase } from 'react-icons/tb'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    dashboard: <HiOutlineHome />,
    forms: <HiOutlineDocumentText />,
    reports: <HiOutlineDocumentReport />,
    masters: <HiOutlineDatabase />,
    cs: <HiOutlineScale />,
    po: <HiOutlineDocumentCurrencyRupee />,
    pos: <BiReceipt />,
    qs: <LuFileUser />,
    ac: <HiOutlineLockClosed />,
    indents: <TbFileDatabase />,
    cash: <HiOutlineCash />,
    approve: <HiShieldCheck />,
}

export default navigationIcon
