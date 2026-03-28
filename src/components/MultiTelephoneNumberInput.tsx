"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Plus, Phone, AlertCircle, CheckCircle, Loader } from "lucide-react"
import api from "../config/api"

interface BillInfo {
  id: string
  telephoneNumber: string
  accountName: string
  accountAddress?: string
  currentBill: number
  dueDate: string
  status: string
  lastPaymentDate?: string
}

interface VerificationResult {
  telephoneNumber: string
  bill?: BillInfo
  source?: 'cache' | 'slt_api'
  warning?: string
}

interface MultiTelephoneNumberInputProps {
  telephoneNumbers: string[]
  onTelephoneNumbersChange: (numbers: string[]) => void
  verifiedBills?: BillInfo[]
  onVerifiedBillsChange?: (bills: BillInfo[]) => void
  maxNumbers?: number
  disabled?: boolean
  autoVerify?: boolean
  className?: string
  language?: "en" | "si" | "ta"
}

const MultiTelephoneNumberInput: React.FC<MultiTelephoneNumberInputProps> = ({
  telephoneNumbers,
  onTelephoneNumbersChange,
  verifiedBills = [],
  onVerifiedBillsChange,
  maxNumbers = 10,
  disabled = false,
  autoVerify = true,
  className = "",
  language = "en"
}) => {
  const [inputValue, setInputValue] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [bills, setBills] = useState<BillInfo[]>(verifiedBills)

  // Update bills when prop changes
  useEffect(() => {
    setBills(verifiedBills)
  }, [verifiedBills])

  // Validate telephone number format
  const validateTelephoneNumber = (number: string): boolean => {
    const phoneRegex = /^\d{10}$/
    return phoneRegex.test(number.trim())
  }

  // Add telephone number
  const handleAddNumber = async () => {
    const number = inputValue.trim()
    
    if (!number) return

    // Validate format
    if (!validateTelephoneNumber(number)) {
      setErrors({ ...errors, [number]: "Invalid telephone number. Must be 10 digits." })
      return
    }

    // Check if already added
    if (telephoneNumbers.includes(number)) {
      setErrors({ ...errors, [number]: "Telephone number already added." })
      return
    }

    // Check max limit
    if (telephoneNumbers.length >= maxNumbers) {
      setErrors({ ...errors, [number]: `Maximum ${maxNumbers} telephone numbers allowed.` })
      return
    }

    // Add to list
    const newNumbers = [...telephoneNumbers, number]
    onTelephoneNumbersChange(newNumbers)
    setInputValue("")

    // Clear any existing errors for this number
    const newErrors = { ...errors }
    delete newErrors[number]
    setErrors(newErrors)

    // Auto-verify if enabled
    if (autoVerify) {
      await verifyTelephoneNumber(number)
    }
  }

  // Remove telephone number
  const handleRemoveNumber = (numberToRemove: string) => {
    const newNumbers = telephoneNumbers.filter(num => num !== numberToRemove)
    onTelephoneNumbersChange(newNumbers)

    // Remove from bills
    const newBills = bills.filter(bill => bill.telephoneNumber !== numberToRemove)
    setBills(newBills)
    onVerifiedBillsChange?.(newBills)

    // Clear errors for this number
    const newErrors = { ...errors }
    delete newErrors[numberToRemove]
    setErrors(newErrors)
  }

  // Verify single telephone number
  const verifyTelephoneNumber = async (number: string) => {
    try {
      setVerifying(true)
      const response = await api.get(`/bills/verify/${number}`)
      
      if (response.data.success) {
        const newBill = response.data.bill
        const updatedBills = [...bills.filter(b => b.telephoneNumber !== number), newBill]
        setBills(updatedBills)
        onVerifiedBillsChange?.(updatedBills)

        // Clear any errors for this number
        const newErrors = { ...errors }
        delete newErrors[number]
        setErrors(newErrors)
      }
    } catch (error: any) {
      console.error(`Error verifying ${number}:`, error)
      setErrors({ 
        ...errors, 
        [number]: error.response?.data?.error || "Failed to verify telephone number" 
      })
    } finally {
      setVerifying(false)
    }
  }

  // Verify all numbers at once
  const verifyAllNumbers = async () => {
    if (telephoneNumbers.length === 0) return

    try {
      setVerifying(true)
      const response = await api.post('/bills/verify-multiple', {
        telephoneNumbers
      })

      if (response.data.success) {
        const verifiedBills = response.data.results
          .filter((result: VerificationResult) => result.bill)
          .map((result: VerificationResult) => result.bill!)

        setBills(verifiedBills)
        onVerifiedBillsChange?.(verifiedBills)

        // Handle errors
        const newErrors: { [key: string]: string } = {}
        response.data.errors?.forEach((error: any) => {
          newErrors[error.telephoneNumber] = error.error
        })
        setErrors(newErrors)
      }
    } catch (error: any) {
      console.error('Error verifying multiple numbers:', error)
      setErrors({
        general: error.response?.data?.error || "Failed to verify telephone numbers"
      })
    } finally {
      setVerifying(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNumber()
    }
  }

  // Get bill for number
  const getBillForNumber = (number: string): BillInfo | undefined => {
    return bills.find(bill => bill.telephoneNumber === number)
  }

  // Get verification status for number
  const getVerificationStatus = (number: string): 'pending' | 'verified' | 'error' => {
    if (errors[number]) return 'error'
    if (getBillForNumber(number)) return 'verified'
    return 'pending'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Input section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {language === "si" ? "දුරකථන අංක" : language === "ta" ? "தொலைபேசி எண்" : "Telephone Numbers"}
        </label>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === "si" ? "දුරකථන අංකය ඇතුල් කරන්න" : language === "ta" ? "தொலைபேசி எண்ணை உள்ளிடவும்" : "Enter telephone number"}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled || telephoneNumbers.length >= maxNumbers}
              maxLength={10}
            />
          </div>
          
          <button
            onClick={handleAddNumber}
            disabled={disabled || !inputValue.trim() || telephoneNumbers.length >= maxNumbers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {language === "si" ? "එකතු කරන්න" : language === "ta" ? "சேர்க்கவும்" : "Add"}
          </button>
        </div>

        {/* General error */}
        {errors.general && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.general}
          </p>
        )}

        {/* Limits info */}
        <p className="text-xs text-gray-500">
          {telephoneNumbers.length}/{maxNumbers} telephone numbers added
        </p>
      </div>

      {/* Added numbers section */}
      {telephoneNumbers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              {language === "si" ? "එකතු කරන ලද දුරකථන අංක" : language === "ta" ? "சேர்க்கப்பட்ட தொலைபேசி எண்கள்" : "Added Telephone Numbers"}
            </h4>
            
            {autoVerify && telephoneNumbers.length > 1 && (
              <button
                onClick={verifyAllNumbers}
                disabled={verifying || disabled}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                {verifying ? (
                  <Loader className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
                {language === "si" ? "සියල්ල සත්‍යාපනය කරන්න" : language === "ta" ? "அனைத்தையும் சரிபார்க்கவும்" : "Verify All"}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {telephoneNumbers.map((number) => {
              const bill = getBillForNumber(number)
              const status = getVerificationStatus(number)
              const error = errors[number]

              return (
                <div
                  key={number}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50"
                >
                  <div className="flex-1 space-y-2">
                    {/* Number and status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{number}</span>
                        
                        {/* Status indicator */}
                        {status === 'verified' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {status === 'pending' && autoVerify && (
                          <button
                            onClick={() => verifyTelephoneNumber(number)}
                            disabled={verifying}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {verifying ? "Verifying..." : "Verify"}
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveNumber(number)}
                        disabled={disabled}
                        className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Bill information */}
                    {bill && (
                      <div className="pl-6 text-sm text-gray-600 space-y-1">
                        <p><strong>Account:</strong> {bill.accountName}</p>
                        <p><strong>Current Bill:</strong> LKR {bill.currentBill.toFixed(2)}</p>
                        <p><strong>Due Date:</strong> {new Date(bill.dueDate).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> 
                          <span className={`ml-1 px-2 py-1 text-xs rounded ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                            bill.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {bill.status}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Error message */}
                    {error && (
                      <p className="pl-6 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          {bills.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Bill Summary</h4>
              <div className="text-sm text-blue-800">
                <p>Total verified bills: {bills.length}</p>
                <p>Total amount: LKR {bills.reduce((sum, bill) => sum + bill.currentBill, 0).toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {verifying && (
        <div className="flex items-center justify-center py-4">
          <Loader className="h-5 w-5 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">
            {language === "si" ? "සත්‍යාපනය වේ..." : language === "ta" ? "சரிபார்க்கிறது..." : "Verifying..."}
          </span>
        </div>
      )}
    </div>
  )
}

export default MultiTelephoneNumberInput