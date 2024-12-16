import React from 'react';

interface NavbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ searchTerm, setSearchTerm }) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value); 
  };

  return (
    <nav className="h-[52px] pb-3 border-b-4 border-zinc-800 shadow-md ">
        <div className="flex flex-row gap-12 px-2 items-start">
          <div className=" px-2 py-1 w-[250px] bg-[#712d8e49] rounded h-[40px]">
            <a 
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block transform -translate-y-1 h-[42px] bg-no-repeat bg-start bg-contain" 
              style={{
                backgroundImage: `url('/shuzzam.png')`,
              }}
            >
            </a>
          </div>
          <div>
          <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for songs..."
                className=" p-2 py-1 mt-0.5 w-[300px] bg-neutral-800 hover:bg-neutral-700 border rounded-md text-white font-semibold"
            />
          </div>
        
        </div>
    </nav>
  );
};

export default Navbar;
