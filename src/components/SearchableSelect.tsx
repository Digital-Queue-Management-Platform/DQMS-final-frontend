import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Option {
    _id: string;
    [key: string]: any;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    error?: boolean;
    displayKey: (option: Option) => string;
    searchKeys: string[];
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
    options, 
    value, 
    onChange, 
    placeholder, 
    disabled = false, 
    error = false, 
    displayKey, 
    searchKeys 
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (searchTerm === '') {
            setFilteredOptions(options);
        } else {
            const filtered = options.filter(option => 
                searchKeys.some(key => 
                    String(option[key]).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
            setFilteredOptions(filtered);
        }
    }, [searchTerm, options, searchKeys]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(option => option._id === value);

    const handleSelect = (option: Option) => {
        onChange(option._id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleInputClick = () => {
        if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={handleInputClick}
                className={`w-full px-3 py-2 border rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                    error ? 'border-red-500' : 'border-gray-300'
                } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
            >
                <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedOption ? displayKey(selectedOption) : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-hidden transition-opacity duration-200">
                    <div className="p-3 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-gray-500 text-center">
                                No outlets found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option._id}
                                    onClick={() => handleSelect(option)}
                                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                        value === option._id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                    }`}
                                >
                                    {displayKey(option)}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;