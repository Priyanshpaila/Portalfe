export const PERMISSIONS = {
    ACCESS_CONTROL: 'access_control',
    VENDOR_ACCESS: 'vendor_access',
    MANAGE_RFQ: 'manage_rfq',
    MANAGE_CS: 'manage_cs',
    MANAGE_PO: 'manage_po',
    VIEW_QUOTATION: 'view_quotation',
    AUTHORIZE_CS: 'authorize_cs',
    AUTHORIZE_PO: 'authorize_po',
    VIEW_INDENT_REGISTER: 'view_indent_register',
    MASTER_CONTROL: 'master_control',
    APPROVE_VENDOR: 'approve_vendor',
}

export const permissionsOptions = Object.values(PERMISSIONS)
    .filter((i) => i !== PERMISSIONS.VENDOR_ACCESS)
    .map((perm) => ({
        value: perm,
        label: perm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }))
