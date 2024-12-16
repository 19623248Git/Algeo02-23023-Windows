'use client'

import { FC } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface PaginationControlsProps {
  totalEntries: number
}

const PaginationControls: FC<PaginationControlsProps> = ({ totalEntries }) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page') ?? '1')
  const per_page = Number(searchParams.get('per_page') ?? '10')
  const totalPages = Math.ceil(totalEntries / per_page)

  const handlePageChange = (newPage: number) => {
    router.push(`/?page=${newPage}&per_page=${per_page}`, { scroll: false })
  }

  return (
    <div className="flex py-4 items-center gap-2">
      
      {/* Tombol ke halaman pertama */}
      <button
        className={`border p-2 rounded-md ${
          page === 1
            ? 'opacity-50 cursor-not-allowed bg-[#a7bac4] text-[#131618] border-black'
            : 'bg-[#003D5B] hover:bg-[#00527A] border-blue-300 text-blue-200'
        }`}
        onClick={() => handlePageChange(1)}
        disabled={page === 1}
      >
        &#171;
      </button>

      {/* Tombol Previous */}
      <button
        className={`border p-2 rounded-md ${
          page === 1
            ? 'opacity-50 cursor-not-allowed bg-[#a7bac4] text-[#131618] border-black'
            : 'bg-[#003D5B] hover:bg-[#00527A] border-blue-300 text-blue-200'
        }`}
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      >
        &#8249;
      </button>

      <span className="text-white font-medium">
        {page} <span className="text-gray-200">of</span> {totalPages}
      </span>

      {/* Tombol Next */}
      <button
        className={`border p-2 rounded-md ${
          page === totalPages
            ? 'opacity-50 cursor-not-allowed bg-[#a7bac4] text-[#131618] border-black'
            : 'bg-[#003D5B] hover:bg-[#00527A] border-blue-300 text-blue-200'
        }`}
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
      >
        &#8250;
      </button>

      <button
        className={`border p-2 rounded-md ${
          page === totalPages
            ? 'opacity-50 cursor-not-allowed bg-[#a7bac4] text-[#131618] border-black'
            : 'bg-[#003D5B] hover:bg-[#00527A] border-blue-300 text-blue-200'
        }`}
        onClick={() => handlePageChange(totalPages)}
        disabled={page === totalPages}
      >
        &#187;
      </button>
    </div>
  )
}

export default PaginationControls
