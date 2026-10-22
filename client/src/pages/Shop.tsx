import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Filter, 
  X, 
  ChevronDown, 
  SlidersHorizontal, 
  RotateCcw, 
  Search, 
  Grid3X3, 
  LayoutGrid, 
  Grid2X2,
  Sparkles,
  Check
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Product, Category, Collection } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';

export const Shop: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatPrice } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(() => {
    const saved = localStorage.getItem('ethniz_shop_grid');
    if (saved === '2' || saved === '3' || saved === '4') {
      return parseInt(saved, 10) as 2 | 3 | 4;
    }
    return 3;
  });

  const handleSetGridCols = (cols: 2 | 3 | 4) => {
    setGridCols(cols);
    localStorage.setItem('ethniz_shop_grid', cols.toString());
  };

  // Filter parameters
  const categoryParam = searchParams.get('category') || '';
  const collectionParam = searchParams.get('collection') || '';
  const genderParam = searchParams.get('gender') || 'ALL';
  const fabricParam = searchParams.get('fabric') || '';
  const occasionParam = searchParams.get('occasion') || '';
  const sizeParam = searchParams.get('size') || '';
  const colorParam = searchParams.get('color') || '';
  const sortParam = searchParams.get('sort') || 'featured';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const inStockParam = searchParams.get('inStock') === 'true';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local inputs
  const [localMinPrice, setLocalMinPrice] = useState(minPriceParam);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPriceParam);
  const [localSearchInput, setLocalSearchInput] = useState(searchParam);

  const fabricsList = ['Pure Katan Silk', 'Royal Velvet', 'Organza', 'Chanderi Silk', 'Georgette', 'Raw Silk', 'Brocade'];
  const occasionsList = ['Bridal', 'Sangeet', 'Mehendi', 'Reception', 'Festive', 'Cocktail'];
  const sizesList = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
  const colorsList = ['Crimson Red', 'Emerald Green', 'Royal Gold', 'Wine / Burgundy', 'Midnight Blue', 'Warm Ivory', 'Dusty Rose'];

  // Fetch categories & collections
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, colRes] = await Promise.all([
          api.get('/categories'),
          api.get('/categories/collections')
        ]);
        setCategories(catRes.data.categories || []);
        setCollections(colRes.data.collections || []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch filtered products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: any = {
          page: pageParam,
          limit: 12,
          sort: sortParam
        };

        if (categoryParam) params.category = categoryParam;
        if (collectionParam) params.collection = collectionParam;
        if (genderParam && genderParam !== 'ALL') params.gender = genderParam;
        if (fabricParam) params.fabric = fabricParam;
        if (occasionParam) params.occasion = occasionParam;
        if (sizeParam) params.size = sizeParam;
        if (colorParam) params.color = colorParam;
        if (minPriceParam) params.minPrice = minPriceParam;
        if (maxPriceParam) params.maxPrice = maxPriceParam;
        if (inStockParam) params.inStock = 'true';
        if (searchParam) params.search = searchParam;

        const res = await api.get('/products', { params });
        setProducts(res.data.products || []);
        setTotalProducts(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Failed to fetch shop products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams]);

  // Update single filter in searchParams
  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value || value === 'ALL') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const applyPriceRangePreset = (min?: number, max?: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (min !== undefined) {
      newParams.set('minPrice', String(min));
      setLocalMinPrice(String(min));
    } else {
      newParams.delete('minPrice');
      setLocalMinPrice('');
    }

    if (max !== undefined) {
      newParams.set('maxPrice', String(max));
      setLocalMaxPrice(String(max));
    } else {
      newParams.delete('maxPrice');
      setLocalMaxPrice('');
    }

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const applyCustomPriceFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    if (localMinPrice) newParams.set('minPrice', localMinPrice);
    else newParams.delete('minPrice');

    if (localMaxPrice) newParams.set('maxPrice', localMaxPrice);
    else newParams.delete('maxPrice');

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    setLocalSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', localSearchInput.trim() ? localSearchInput.trim() : null);
  };

  const hasActiveFilters = Boolean(
    categoryParam || collectionParam || (genderParam && genderParam !== 'ALL') || fabricParam || occasionParam || sizeParam || colorParam || minPriceParam || maxPriceParam || inStockParam || searchParam
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 pb-32 lg:pb-12">
      
      {/* 1. EDITORIAL HEADER */}
      <div className="mb-6 sm:mb-10 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.25em] mb-2 font-sans">
          <span>Home</span>
          <span className="text-[#C6A15D]">/</span>
          <span className="text-zinc-900 font-semibold">Couture Catalogue</span>
          {categoryParam && (
            <>
              <span className="text-[#C6A15D]">/</span>
              <span className="text-[#3E1A1E] font-bold capitalize">
                {categories.find((c) => c.slug === categoryParam)?.name || categoryParam.replace('-', ' ')}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-[#C6A15D]/25">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.3em] text-[#C6A15D] uppercase block mb-1">
              Atelier Vault
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-[#1A1A1A] tracking-tight">
              SHOP
            </h1>
            <p className="font-serif italic text-xs sm:text-base text-zinc-600 mt-1.5 sm:mt-2 max-w-xl">
              Discover the EthnizCouture collection — handcrafted heirlooms woven across Varanasi, Lucknow, and royal Rajasthan.
            </p>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-3 shrink-0">
            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-widest bg-[#FAF7F2] px-3.5 py-1.5 rounded border border-[#C6A15D]/30">
              {products.length} of {totalProducts} Ensembles
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTROL BAR: Search, Active Filters, Layout Switcher & Sort */}
      <div className="bg-white rounded-xl border border-[#E8DEC8] p-3 sm:p-4 mb-6 sm:mb-8 shadow-xs space-y-3">
        
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 h-11 px-4 bg-[#FAF7F2] border border-[#C6A15D]/40 rounded-xl text-xs font-bold uppercase tracking-wider text-[#3E1A1E] hover:bg-[#F5EFE6] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#C6A15D]" />
            <span>Refine Pieces {hasActiveFilters && '•'}</span>
          </button>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C6A15D]" />
            <input
              type="text"
              placeholder="Search weaves, motifs, attire..."
              value={localSearchInput}
              onChange={(e) => setLocalSearchInput(e.target.value)}
              className="w-full h-11 sm:h-10 pl-9 pr-7 bg-[#FAF7F2] border border-[#E8DEC8] rounded-xl sm:rounded-lg text-base sm:text-xs text-[#1A1A1A] placeholder:text-zinc-400 focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all shadow-xs"
            />
            {localSearchInput && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearchInput('');
                  updateFilter('search', null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Grid Layout Switcher (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E8DEC8]">
            <button
              onClick={() => handleSetGridCols(2)}
              className={`p-2 rounded-md transition-colors ${gridCols === 2 ? 'bg-[#3E1A1E] text-[#DFC89D] font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
              title="2 Columns (Editorial Large)"
              aria-label="2 Columns Layout"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSetGridCols(3)}
              className={`p-2 rounded-md transition-colors ${gridCols === 3 ? 'bg-[#3E1A1E] text-[#DFC89D] font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
              title="3 Columns (Classic Lookbook)"
              aria-label="3 Columns Layout"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSetGridCols(4)}
              className={`p-2 rounded-md transition-colors ${gridCols === 4 ? 'bg-[#3E1A1E] text-[#DFC89D] font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900'}`}
              title="4 Columns (Compact Grid)"
              aria-label="4 Columns Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Select */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 font-sans">
              Sort:
            </label>
            <select
              value={sortParam}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="h-10 px-3.5 bg-[#FAF7F2] border border-[#E8DEC8] rounded-lg text-xs font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#3E1A1E] focus:ring-2 focus:ring-[#C6A15D]/30 transition-all cursor-pointer shadow-xs"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="best_rated">Best Rated</option>
            </select>
          </div>

        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3E1A1E]/10 text-[#3E1A1E] border border-[#3E1A1E]/30 rounded text-xs font-bold hover:bg-[#3E1A1E]/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>

            {categoryParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Category: {categories.find((c) => c.slug === categoryParam)?.name || categoryParam}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('category', null)} />
              </span>
            )}

            {collectionParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Collection: {collections.find((c) => c.slug === collectionParam)?.name || collectionParam}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('collection', null)} />
              </span>
            )}

            {genderParam && genderParam !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                For: {genderParam === 'WOMEN' ? 'Women' : 'Men'}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('gender', null)} />
              </span>
            )}

            {fabricParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Fabric: {fabricParam}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('fabric', null)} />
              </span>
            )}

            {occasionParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Occasion: {occasionParam}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('occasion', null)} />
              </span>
            )}

            {sizeParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Size: {sizeParam}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('size', null)} />
              </span>
            )}

            {colorParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Color: {colorParam}
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('color', null)} />
              </span>
            )}

            {(minPriceParam || maxPriceParam) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Price: {minPriceParam ? formatPrice(Number(minPriceParam)) : '₹0'} - {maxPriceParam ? formatPrice(Number(maxPriceParam)) : '∞'}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-700"
                  onClick={() => {
                    updateFilter('minPrice', null);
                    updateFilter('maxPrice', null);
                  }}
                />
              </span>
            )}

            {inStockParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                In Stock Only
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('inStock', null)} />
              </span>
            )}

            {searchParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#3E1A1E] border border-[#C6A15D]/40 rounded-full text-xs font-medium">
                Query: "{searchParam}"
                <X className="w-3 h-3 cursor-pointer hover:text-red-700" onClick={() => updateFilter('search', null)} />
              </span>
            )}
          </div>
        )}

      </div>

      {/* 3. MAIN SHOP LAYOUT (Left Filter Sidebar + Products Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* DESKTOP REFINED FILTER SIDEBAR (3 cols) */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          
          {/* Availability Filter */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Availability
            </h3>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 hover:text-[#3E1A1E]">
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : null)}
                className="accent-[#3E1A1E] w-4 h-4 rounded"
              />
              <span>In Stock & Ready for Dispatch</span>
            </label>
          </div>

          {/* Department / Silhouettes */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Silhouettes
            </h3>
            <div className="space-y-2 text-xs font-medium text-zinc-700">
              {[
                { id: 'ALL', label: 'All Ensembles' },
                { id: 'WOMEN', label: 'Women’s Couture' },
                { id: 'MEN', label: 'Royal Menswear' }
              ].map((g) => (
                <label key={g.id} className="flex items-center gap-2.5 cursor-pointer hover:text-[#3E1A1E]">
                  <input
                    type="radio"
                    name="gender"
                    checked={genderParam === g.id}
                    onChange={() => updateFilter('gender', g.id)}
                    className="accent-[#3E1A1E]"
                  />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Category
            </h3>
            <div className="space-y-2 text-xs font-medium text-zinc-700 max-h-56 overflow-y-auto pr-1">
              <label className="flex items-center gap-2.5 cursor-pointer hover:text-[#3E1A1E]">
                <input
                  type="radio"
                  name="category"
                  checked={!categoryParam}
                  onChange={() => updateFilter('category', null)}
                  className="accent-[#3E1A1E]"
                />
                <span>All Categories ({totalProducts})</span>
              </label>
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer hover:text-[#3E1A1E]">
                  <input
                    type="radio"
                    name="category"
                    checked={categoryParam === cat.slug}
                    onChange={() => updateFilter('category', cat.slug)}
                    className="accent-[#3E1A1E]"
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Collection Filter */}
          {collections.length > 0 && (
            <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
              <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
                Collection
              </h3>
              <div className="space-y-2 text-xs font-medium text-zinc-700">
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-[#3E1A1E]">
                  <input
                    type="radio"
                    name="collection"
                    checked={!collectionParam}
                    onChange={() => updateFilter('collection', null)}
                    className="accent-[#3E1A1E]"
                  />
                  <span>All Curations</span>
                </label>
                {collections.map((col) => (
                  <label key={col.id} className="flex items-center gap-2.5 cursor-pointer hover:text-[#3E1A1E]">
                    <input
                      type="radio"
                      name="collection"
                      checked={collectionParam === col.slug}
                      onChange={() => updateFilter('collection', col.slug)}
                      className="accent-[#3E1A1E]"
                    />
                    <span>{col.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sizes Filter */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Size
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {sizesList.map((s) => (
                <button
                  key={s}
                  onClick={() => updateFilter('size', sizeParam === s ? null : s)}
                  className={`min-w-10 px-3 py-1.5 text-xs rounded border transition-all ${
                    sizeParam === s
                      ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E] font-bold shadow-xs'
                      : 'bg-[#FAF7F2] text-zinc-700 border-zinc-200 hover:border-[#C6A15D]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Colors Filter */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Color
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {colorsList.map((col) => (
                <button
                  key={col}
                  onClick={() => updateFilter('color', colorParam === col ? null : col)}
                  className={`px-3 py-1.5 text-xs rounded border transition-all ${
                    colorParam === col
                      ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E] font-bold shadow-xs'
                      : 'bg-[#FAF7F2] text-zinc-700 border-zinc-200 hover:border-[#C6A15D]'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          {/* Fabrics Filter */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Fabric Weaves
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {fabricsList.map((f) => (
                <button
                  key={f}
                  onClick={() => updateFilter('fabric', fabricParam === f ? null : f)}
                  className={`px-3 py-1.5 text-xs rounded border transition-all ${
                    fabricParam === f
                      ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E] font-bold shadow-xs'
                      : 'bg-[#FAF7F2] text-zinc-700 border-zinc-200 hover:border-[#C6A15D]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Occasion Filter */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">
              Occasion
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {occasionsList.map((occ) => (
                <button
                  key={occ}
                  onClick={() => updateFilter('occasion', occasionParam === occ ? null : occ)}
                  className={`px-3 py-1.5 text-xs rounded border transition-all ${
                    occasionParam === occ
                      ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E] font-bold shadow-xs'
                      : 'bg-[#FAF7F2] text-zinc-700 border-zinc-200 hover:border-[#C6A15D]'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Price Ranges */}
          <div className="bg-white p-5 rounded-lg border border-[#C6A15D]/25 space-y-3">
            <h3 className="font-serif text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">
              Price Range
            </h3>
            
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => applyPriceRangePreset(undefined, 15000)}
                className="w-full text-left py-1 px-2 rounded hover:bg-[#FAF7F2] text-zinc-700 font-medium"
              >
                Under {formatPrice(15000)}
              </button>
              <button
                onClick={() => applyPriceRangePreset(15000, 35000)}
                className="w-full text-left py-1 px-2 rounded hover:bg-[#FAF7F2] text-zinc-700 font-medium"
              >
                {formatPrice(15000)} - {formatPrice(35000)}
              </button>
              <button
                onClick={() => applyPriceRangePreset(35000, 75000)}
                className="w-full text-left py-1 px-2 rounded hover:bg-[#FAF7F2] text-zinc-700 font-medium"
              >
                {formatPrice(35000)} - {formatPrice(75000)}
              </button>
              <button
                onClick={() => applyPriceRangePreset(75000, undefined)}
                className="w-full text-left py-1 px-2 rounded hover:bg-[#FAF7F2] text-[#3E1A1E] font-bold"
              >
                Heirloom Bridal ({formatPrice(75000)}+)
              </button>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={localMinPrice}
                onChange={(e) => setLocalMinPrice(e.target.value)}
                className="w-1/2 h-10 px-3 text-base sm:text-xs border border-zinc-300 rounded-lg focus:outline-none focus:border-[#3E1A1E]"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={localMaxPrice}
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                className="w-1/2 h-10 px-3 text-base sm:text-xs border border-zinc-300 rounded-lg focus:outline-none focus:border-[#3E1A1E]"
              />
            </div>
            <button
              onClick={applyCustomPriceFilter}
              className="w-full h-10 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Apply Filter
            </button>
          </div>

        </div>

        {/* PRODUCTS CATALOGUE GRID (9 cols) */}
        <div className="lg:col-span-9">
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-zinc-200 space-y-3">
                  <div className="aspect-[3/4] bg-zinc-200 rounded" />
                  <div className="h-4 bg-zinc-200 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 rounded w-1/2" />
                  <div className="h-5 bg-zinc-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#C6A15D]/30 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-[#FAF7F2] border border-[#C6A15D]/40 rounded-full flex items-center justify-center mx-auto text-[#C6A15D]">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-normal text-[#1A1A1A]">No Ensembles Found</h3>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed font-light">
                No couture pieces match your exact criteria. Clear selected facets or explore our new festive arrivals.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2.5 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] rounded text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-2.5 sm:gap-6 lg:gap-8 ${
                gridCols === 2
                  ? 'grid-cols-2 sm:grid-cols-2'
                  : gridCols === 3
                  ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-14 flex items-center justify-center gap-2">
              {[...Array(totalPages)].map((_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    onClick={() => updateFilter('page', String(p))}
                    className={`w-10 h-10 rounded border text-xs font-bold transition-all ${
                      pageParam === p
                        ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E] shadow-sm'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-[#C6A15D]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* MOBILE FILTER DRAWER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col border-l border-[#C6A15D]/40">
              
              <div className="p-4 border-b border-[#C6A15D]/25 flex items-center justify-between bg-[#FAF7F2]">
                <h2 className="font-serif text-lg font-bold text-[#1A1A1A]">Refine Couture Collection</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1.5 text-zinc-500 hover:text-black rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
                {/* Availability */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-2 uppercase">Availability</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStockParam}
                      onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : null)}
                      className="accent-[#3E1A1E]"
                    />
                    <span>In Stock Only</span>
                  </label>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-2 uppercase">Category</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="m_category"
                        checked={!categoryParam}
                        onChange={() => updateFilter('category', null)}
                        className="accent-[#3E1A1E]"
                      />
                      <span>All Categories</span>
                    </label>
                    {categories.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="m_category"
                          checked={categoryParam === c.slug}
                          onChange={() => updateFilter('category', c.slug)}
                          className="accent-[#3E1A1E]"
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-2 uppercase">Size</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {sizesList.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateFilter('size', sizeParam === s ? null : s)}
                        className={`px-3 py-1.5 rounded border ${
                          sizeParam === s
                            ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E]'
                            : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-2 uppercase">Color</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {colorsList.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateFilter('color', colorParam === c ? null : c)}
                        className={`px-3 py-1.5 rounded border ${
                          colorParam === c
                            ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E]'
                            : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fabrics */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-2 uppercase">Fabric</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {fabricsList.map((f) => (
                      <button
                        key={f}
                        onClick={() => updateFilter('fabric', fabricParam === f ? null : f)}
                        className={`px-3 py-1.5 rounded border ${
                          fabricParam === f
                            ? 'bg-[#3E1A1E] text-[#DFC89D] border-[#3E1A1E]'
                            : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#C6A15D]/25 bg-[#FAF7F2] flex gap-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
                <button
                  onClick={clearAllFilters}
                  className="flex-1 py-3 border border-zinc-300 rounded-lg font-bold uppercase tracking-wider text-zinc-700 text-xs active:bg-zinc-100"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 py-3 bg-[#3E1A1E] text-[#DFC89D] rounded-lg font-bold uppercase tracking-wider text-xs active:bg-[#2B0C10] shadow-md"
                >
                  Apply Filters
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. FLIPKART-STYLE MOBILE STICKY SORT & FILTER BAR */}
      <div
        className="fixed inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E8DEC8] py-2 px-3 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          onClick={() => setIsMobileSortOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-800 border-r border-zinc-200 active:bg-zinc-50 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#3E1A1E]" />
          <span>
            {sortParam === 'price_asc'
              ? 'Price: Low-High'
              : sortParam === 'price_desc'
              ? 'Price: High-Low'
              : sortParam === 'newest'
              ? 'Newest'
              : sortParam === 'best_rated'
              ? 'Best Rated'
              : 'Featured'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[#3E1A1E] active:bg-zinc-50 transition-colors"
        >
          <Filter className="w-3.5 h-3.5 text-[#3E1A1E]" />
          <span>Filter {hasActiveFilters && '(Active)'}</span>
        </button>
      </div>

      {/* 5. FLIPKART-STYLE MOBILE SORT BOTTOM SHEET */}
      {isMobileSortOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in lg:hidden">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileSortOpen(false)}
          />
          <div
            className="relative w-full bg-white rounded-t-[28px] border-t border-[#C6A15D]/40 shadow-2xl p-5 space-y-4 animate-slide-up z-10 max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          >
            {/* Pull handle */}
            <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif text-base font-bold text-zinc-900 tracking-wide uppercase">
                Sort Ensembles By
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileSortOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { value: 'featured', label: 'Featured Ensembles (Curated)' },
                { value: 'newest', label: 'Newest Arrivals 2026' },
                { value: 'price_asc', label: 'Price: Low to High' },
                { value: 'price_desc', label: 'Price: High to Low' },
                { value: 'best_rated', label: 'Customer Rating: High to Low' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    updateFilter('sort', opt.value);
                    setIsMobileSortOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left text-xs font-semibold transition-colors ${
                    sortParam === opt.value
                      ? 'bg-[#3E1A1E]/10 text-[#3E1A1E] font-bold'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {sortParam === opt.value && (
                    <Check className="w-4 h-4 text-[#3E1A1E]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
