'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { CyclopsNft, TraitFacets } from '@/lib/traits';
import { Panel } from '@/components/ascii/panel';
import { Button } from '@/components/ascii/button';

interface NftsResponse {
  items: CyclopsNft[];
  total: number;
  page: number;
  pageSize: number;
  facets: TraitFacets;
}

export function CollectionBrowser() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NftsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (Object.keys(selected).length) params.set('traits', JSON.stringify(selected));
    params.set('page', String(page));
    return params.toString();
  }, [search, selected, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/nfts?${queryString}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  function toggleTrait(traitType: string, value: string) {
    setPage(1);
    setSelected((prev) => {
      const current = prev[traitType] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const copy = { ...prev, [traitType]: next };
      if (next.length === 0) delete copy[traitType];
      return copy;
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <Panel title="Filters" className="h-fit">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="serial or owner"
          className="mb-4 w-full border border-neutral-700 bg-base px-2 py-1 text-xs text-ink placeholder:text-muted"
        />
        {Object.entries(data?.facets ?? {}).map(([trait, values]) => (
          <div key={trait} className="mb-4">
            <div className="mb-1 text-xs uppercase text-sage">{trait}</div>
            <div className="flex flex-wrap gap-1">
              {values.map((value) => (
                <button
                  key={value}
                  onClick={() => toggleTrait(trait, value)}
                  className={`border px-2 py-0.5 text-[10px] ${
                    selected[trait]?.includes(value)
                      ? 'border-sage text-sage'
                      : 'border-neutral-700 text-muted'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Panel>

      <div>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-muted">No Cyclops match these filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((nft) => (
              <div key={`${nft.tokenId}-${nft.serial}`} className="border border-neutral-800 p-2">
                <div className="relative aspect-square w-full bg-neutral-900">
                  <Image
                    src={nft.metadata.image}
                    alt={nft.metadata.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="mt-2 truncate text-xs text-muted">#{nft.serial}</p>
              </div>
            ))}
          </div>
        )}

        {data && data.total > data.pageSize ? (
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button
              variant="ghost"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
