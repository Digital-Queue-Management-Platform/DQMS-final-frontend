export interface Customer {
  id: string
  name: string
  mobileNumber: string
  sltMobileNumber?: string
  nicNumber?: string
  email?: string
  createdAt: string
}

export interface Token {
  id: string
  tokenNumber: number
  customerId: string
  customer: Customer
  serviceTypes: string[]
  preferredLanguages?: string[]
  accountRef?: string
  status: string
  outletId: string
  outlet?: Outlet
  assignedTo?: string
  officer?: Officer
  counterNumber?: number
  createdAt: string
  calledAt?: string
  startedAt?: string
  completedAt?: string
}

export interface Officer {
  id: string
  name: string
  mobileNumber: string
  outletId: string
  outlet?: Outlet
  status: string
  counterNumber?: number
  isTraining: boolean
  languages?: string[]
  createdAt: string
  lastLoginAt?: string
}

export interface Outlet {
  id: string
  name: string
  location: string
  regionId: string
  region?: Region
  isActive: boolean
  createdAt: string
  counterCount?: number
}

export interface Region {
  id: string
  name: string
  managerId?: string
  managerEmail?: string
  managerMobile?: string
  createdAt: string
}

export interface Feedback {
  id: string
  tokenId: string
  customerId: string
  rating: number
  comment?: string
  createdAt: string
}

export interface Alert {
  id: string
  type: string
  severity: string
  message: string
  relatedEntity?: string
  isRead: boolean
  createdAt: string
}
