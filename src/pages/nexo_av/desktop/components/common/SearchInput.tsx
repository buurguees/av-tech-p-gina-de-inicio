import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchInputProps {
  placeholder?: string;
  onSearchChange: (searchTerm: string) => void;
  className?: string;
  defaultValue?: string;
}

const SearchInput = ({
  placeholder = "Buscar...",
  onSearchChange,
  className = "",
  defaultValue = "",
}: SearchInputProps) => {
  const [searchInput, setSearchInput] = useState(defaultValue);
  const debouncedSearchTerm = useDebounce(searchInput, 500);

  useEffect(() => {
    onSearchChange(debouncedSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  return (
    <div className={`relative min-w-[300px] w-full max-w-md ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="pl-10 pr-4 py-3 h-12 text-base border border-gray-300 rounded-full bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:shadow-md transition-shadow"
      />
    </div>
  );
};

export default SearchInput;
