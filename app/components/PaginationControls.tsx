'use client'

import { FC } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface PaginationControlsProps {
  hasNextPage: boolean
  hasPrevPage: boolean
  totalEntries: number 
}

const PaginationControls: FC<PaginationControlsProps> = ({totalEntries, }) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page') ?? '1') 
  const per_page = Number(searchParams.get('per_page') ?? '10') 
  const totalPages = Math.ceil(totalEntries / per_page)


  const handlePageChange = (newPage: number) => {

    router.push(`/?page=${newPage}&per_page=${per_page}`, { scroll: false })
  }
  const getDisplayedPages = () => {
    const range: number[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) range.push(i)
    } else {
      if (page <= 3) {
        range.push(1, 2, 3, 4, totalPages)
      } else if (page > totalPages - 3) {
        range.push(1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        range.push(1, page - 1, page + 1, totalPages)
      }
    }
      return range
  }

  const displayedPages = getDisplayedPages()
  
  return (
    <div className="flex py-4 items-center gap-2 ">
      {/* Tombol Prev tidak akan terlihat di page pertama */}
      {page > 1 && (
        <button
          className="bg-blue-500 hover:bg-blue-400 text-white p-1 rounded-md transform hover:scale-105 active:scale-100"
          onClick={() => {
            handlePageChange(page - 1) 
          }}
        >
          Prev
        </button>
      )}

      {displayedPages.map((p, index) => (
        <button
          key={index}
          className={`p-1 min-w-[28px] rounded-md text-center ${
            p === page ? 'bg-[#bcdcdc] hover:bg-[#cde2e2] text-black ' : 'bg-[#370e49] hover:bg-[#481f59] border  text-gray-200'
          }`}
          onClick={() => handlePageChange(p)}
          disabled={p === page}
        > 
          {/* Menampilkan ... setelah button page pertama  */}
          {p === 1 && page > 3 && p !== displayedPages[index + 1] && '...'}
          {p}
          {/* Menampilkan ... sebelum button page terakhir  */}
          {p === totalPages && page < totalPages - 3 && p !== displayedPages[index - 1] && '...'}
        </button>
      ))}

      {/* Tombol Next tidak akan keluar di page terakhir*/}
      {page < totalPages && (
        <button
          className="bg-blue-500 hover:bg-blue-400 text-white p-1 rounded-md transform hover:scale-105 active:scale-100"
          onClick={() => {
            handlePageChange(page + 1) 
          }}
        >
          Next
        </button>
      )}
    </div>
  )
}

export default PaginationControls
