// src/components/profile/FirmEmployeesManager.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  HiOutlineUsers,
  HiOutlineRefresh,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineKey,
  HiOutlineIdentification,
} from 'react-icons/hi'

import { Button } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { RoleType } from '@/@types/app'
import { UserApi, type FirmEmployee } from '@/services/user.api'

function clsx(...arr: Array<string | false | undefined | null>) {
  return arr.filter(Boolean).join(' ')
}

function InputRow({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <span>{label}</span>
      </label>
      <div className="mt-1">
        <input
          type={type}
          className={clsx(
            'w-full rounded-xl border px-3 py-2.5 transition',
            'border-gray-200 dark:border-gray-700',
            disabled
              ? 'bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-gray-700',
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

function SelectRow({
  icon,
  label,
  value,
  onChange,
  disabled,
  options,
  placeholder = 'Select...',
}: {
  icon?: React.ReactNode
  label: string
  value: string
  onChange?: (v: string) => void
  disabled?: boolean
  options: Array<{ label: string; value: string }>
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <span>{label}</span>
      </label>

      <div className="mt-1 relative">
        <select
          className={clsx(
            'w-full rounded-xl border px-3 py-2.5 pr-9 transition appearance-none',
            'border-gray-200 dark:border-gray-700',
            disabled
              ? 'bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-gray-700',
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* caret */}
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  )
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function unwrap(res: any) {
  return res?.data ?? res
}

export default function FirmEmployeesManager({
  seatsAllowed,
  onChanged,
}: {
  seatsAllowed?: number | null
  onChanged?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [employees, setEmployees] = useState<FirmEmployee[]>([])

  // ✅ roles state (from /role API)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roles, setRoles] = useState<RoleType[]>([])
  const [rolesError, setRolesError] = useState<string>('')

  const [draft, setDraft] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    role: '',
  })

  const seatsUsed = employees.length
  const seatText = useMemo(() => {
    if (!seatsAllowed || !Number.isFinite(Number(seatsAllowed))) return `${seatsUsed} used`
    return `${seatsUsed} / ${seatsAllowed} used`
  }, [seatsAllowed, seatsUsed])

  const roleOptions = useMemo(() => {
    // If you want only active roles, uncomment next line:
    // const list = roles.filter((r) => (r as any)?.status === 1)
    const list = roles || []
    return list
      .filter((r) => r && r._id)
      .map((r) => ({
        value: String(r._id),
        label: String(r.name || r._id),
      }))
  }, [roles])

  async function loadRoles() {
    setRolesLoading(true)
    setRolesError('')
    try {
      // Same API as AccessControl
      const res = await ApiService.fetchData<{ roles: RoleType[] }>({
        method: 'get',
        url: '/role',
      })

      const raw = unwrap(res)
      // support multiple possible shapes
      const list =
        (Array.isArray(raw?.roles) && raw.roles) ||
        (Array.isArray(raw?.data?.roles) && raw.data.roles) ||
        (Array.isArray(raw?.roles?.roles) && raw.roles.roles) ||
        []

      setRoles(list || [])
    } catch (e: any) {
      setRoles([])
      const msg = e?.response?.data?.message || e?.message || 'Failed to load roles'
      setRolesError(msg)
      // don’t hard-block creation; we keep fallback input
      toast.error(msg)
    } finally {
      setRolesLoading(false)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await UserApi.getFirmEmployees()
      const raw = unwrap(res)
      const list = Array.isArray(raw?.employees)
        ? raw.employees
        : Array.isArray(raw?.data?.employees)
          ? raw.data.employees
          : []
      setEmployees(list || [])
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createEmployee() {
    const name = String(draft.name || '').trim()
    const username = String(draft.username || '').trim()
    const password = String(draft.password || '').trim()
    const email = String(draft.email || '').trim()
    const role = String(draft.role || '').trim()

    if (!name || !username || !password) {
      return toast.error('Name, username and password are required')
    }

    setCreating(true)
    try {
      const res = await UserApi.createFirmEmployee({
        name,
        username,
        password,
        email: email || undefined,
        role: role || null,
      })

      const raw = unwrap(res)
      if (raw?.ok === false) throw new Error(raw?.message || 'Failed to create employee')

      toast.success('Employee created')
      setDraft({ name: '', username: '', password: '', email: '', role: '' })
      await load()
      onChanged?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to create employee')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2">
          <HiOutlineUsers className="text-xl text-gray-600 dark:text-gray-300 mt-0.5" />
          <div>
            <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Firm Employees</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Create and manage seat users. Only firm root can do this.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-gray-800/60 dark:text-gray-200">
            Seats: {seatText}
          </div>

          <Button
            icon={<HiOutlineRefresh />}
            variant="plain"
            className="hover:bg-slate-100 dark:hover:bg-gray-800"
            onClick={load as any}
            loading={loading as any}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Create form */}
      <div className="mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4">
        <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Create Employee</div>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Username + password are for login. You can set a temporary password and ask the employee to change it.
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InputRow
            icon={<HiOutlineUser className="text-base" />}
            label="Name"
            value={draft.name}
            onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
            placeholder="Employee name"
          />
          <InputRow
            icon={<HiOutlineIdentification className="text-base" />}
            label="Username"
            value={draft.username}
            onChange={(v) => setDraft((p) => ({ ...p, username: v }))}
            placeholder="unique username"
          />
          <InputRow
            icon={<HiOutlineKey className="text-base" />}
            label="Password"
            type="password"
            value={draft.password}
            onChange={(v) => setDraft((p) => ({ ...p, password: v }))}
            placeholder="temporary password"
          />

          <InputRow
            icon={<HiOutlineMail className="text-base" />}
            label="Email (optional)"
            value={draft.email}
            onChange={(v) => setDraft((p) => ({ ...p, email: v }))}
            placeholder="name@company.com"
          />

          {/* ✅ Role dropdown from /role API (fallback to old input if roles not available) */}
          {roleOptions.length > 0 ? (
            <SelectRow
              icon={<HiOutlineIdentification className="text-base" />}
              label="Role (optional)"
              value={draft.role}
              onChange={(v) => setDraft((p) => ({ ...p, role: v }))}
              disabled={rolesLoading}
              options={roleOptions}
              placeholder={rolesLoading ? 'Loading roles...' : 'Select role'}
            />
          ) : (
            <InputRow
              icon={<HiOutlineIdentification className="text-base" />}
              label="Role ID (optional)"
              value={draft.role}
              onChange={(v) => setDraft((p) => ({ ...p, role: v }))}
              placeholder={rolesError ? 'Roles not loaded (enter ObjectId)' : 'Mongo ObjectId'}
              disabled={false}
            />
          )}

          <div className="flex items-end">
            <Button
              icon={<HiOutlinePlus />}
              variant="solid"
              className="w-full"
              loading={creating as any}
              disabled={creating as any}
              onClick={createEmployee as any}
            >
              Create Employee
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100">Employees ({employees.length})</div>

        {employees.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
            No employees created yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-extrabold text-gray-700 dark:text-gray-200">Name</th>
                  <th className="px-4 py-3 font-extrabold text-gray-700 dark:text-gray-200">Username</th>
                  <th className="px-4 py-3 font-extrabold text-gray-700 dark:text-gray-200">Email</th>
                  <th className="px-4 py-3 font-extrabold text-gray-700 dark:text-gray-200">Created</th>
                  <th className="px-4 py-3 font-extrabold text-gray-700 dark:text-gray-200">Pwd</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={String(e?._id)} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{e?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{e?.username || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{e?.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmtDate(e?.createdAt as any)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          String((e as any)?.passwordStatus || '').toLowerCase() === 'temporary'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
                        )}
                      >
                        {(e as any)?.passwordStatus || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}