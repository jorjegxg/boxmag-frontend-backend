"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaBars, FaSearch, FaTimes } from "react-icons/fa";
import { useLanguage } from "../../i18n/language-context";

type BoxType = {
  id: number;
  title: string;
  isActive: boolean;
};

type BoxTypeProduct = {
  id: number;
  boxTypeId: number;
  itemNo: string;
  productName: string;
};

export function Header() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [defaultBoxTypes, setDefaultBoxTypes] = useState<BoxType[]>([]);
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [boxTypeProducts, setBoxTypeProducts] = useState<BoxTypeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const loadDefaultBoxTypes = async () => {
    if (defaultBoxTypes.length > 0) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types`);
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: Array<{ id: number; title: string; isActive: boolean }>;
      };
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
        throw new Error(
          payload.message ?? `Failed to load box types (${response.status})`,
        );
      }
      const activeTypes = payload.data
        .filter((type) => type.isActive)
        .slice(0, 8);
      setDefaultBoxTypes(activeTypes);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load box types",
      );
      setDefaultBoxTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setLoadError(null);
      setBoxTypes([]);
      setBoxTypeProducts([]);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const boxTypesResponse = await fetch(
          `${backendBaseUrl}/api/box-types`,
          {
            signal: controller.signal,
          },
        );
        const boxTypesPayload = (await boxTypesResponse.json()) as {
          ok?: boolean;
          message?: string;
          data?: Array<{ id: number; title: string; isActive: boolean }>;
        };
        if (
          !boxTypesResponse.ok ||
          boxTypesPayload.ok !== true ||
          !Array.isArray(boxTypesPayload.data)
        ) {
          throw new Error(
            boxTypesPayload.message ??
              `Failed to load box types (${boxTypesResponse.status})`,
          );
        }

        const activeTypes = boxTypesPayload.data.filter(
          (type) => type.isActive,
        );
        const matchingTypes = activeTypes.filter((type) =>
          type.title.toLowerCase().includes(trimmedQuery.toLowerCase()),
        );

        const productResponses = await Promise.all(
          activeTypes.map(async (type) => {
            const response = await fetch(
              `${backendBaseUrl}/api/box-types/${type.id}/products`,
              { signal: controller.signal },
            );
            const payload = (await response.json()) as {
              ok?: boolean;
              message?: string;
              data?: Array<{
                id: number;
                boxTypeId: number;
                itemNo: string;
                productName: string;
              }>;
            };
            if (
              !response.ok ||
              payload.ok !== true ||
              !Array.isArray(payload.data)
            ) {
              throw new Error(
                payload.message ??
                  `Failed to load box type products (${response.status})`,
              );
            }
            return payload.data.map((product) => ({
              id: product.id,
              boxTypeId: type.id,
              itemNo: String(product.itemNo ?? ""),
              productName: String(product.productName ?? ""),
            }));
          }),
        );

        const flattenedProducts = productResponses.flat();
        const matchingProducts = flattenedProducts.filter((product) => {
          const normalized = trimmedQuery.toLowerCase();
          return (
            product.productName.toLowerCase().includes(normalized) ||
            product.itemNo.toLowerCase().includes(normalized)
          );
        });

        if (!isCancelled) {
          setBoxTypes(matchingTypes.slice(0, 6));
          setBoxTypeProducts(matchingProducts.slice(0, 8));
        }
      } catch (error) {
        if (controller.signal.aborted || isCancelled) return;
        setLoadError(error instanceof Error ? error.message : "Search failed");
        setBoxTypes([]);
        setBoxTypeProducts([]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [backendBaseUrl, query]);

  return (
    <header className="w-full border-b border-my-light-gray bg-white">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 flex gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative shrink-0" ref={menuContainerRef}>
          <button
            type="button"
            aria-label="Open shop menu"
            onClick={() => {
              setIsMenuOpen((prev) => !prev);
              void loadDefaultBoxTypes();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-my-light-gray text-black hover:bg-gray-50"
          >
            {isMenuOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
          </button>
          {isMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[240px] rounded-lg border border-my-light-gray bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                box_types
              </p>
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : loadError ? (
                <p className="text-sm text-red-600">{loadError}</p>
              ) : defaultBoxTypes.length === 0 ? (
                <p className="text-sm text-gray-500">No box types found.</p>
              ) : (
                <ul className="space-y-1">
                  {defaultBoxTypes.map((type) => (
                    <li key={type.id}>
                      <Link
                        href={`/shop?boxTypeId=${type.id}`}
                        className="block rounded px-2 py-1.5 text-sm text-black hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {type.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/svgs/logo/boxmag_logo.svg"
            alt="BOXMAG"
            width={160}
            height={48}
            className="h-10 w-auto lg:h-12"
          />
        </Link>
        {/* expanded space on mobile */}
        <div className="max-md:flex-1 "></div>

        {/* Search bar - center on desktop */}
        <div className="  max-w-xl mx-auto lg:mx-8 w-full max-md:hidden">
          <form
            ref={searchContainerRef}
            role="search"
            className="relative flex items-center"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="search"
              placeholder={t("header.searchPlaceholder")}
              className="w-full rounded-lg border border-my-light-gray bg-white py-2.5 pl-4 pr-10 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-blue focus:border-my-blue"
              aria-label={t("header.searchAria")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                setIsDropdownOpen(true);
                void loadDefaultBoxTypes();
              }}
              onClick={() => {
                setIsDropdownOpen(true);
                void loadDefaultBoxTypes();
              }}
            />
            <span className="absolute right-3 pointer-events-none text-my-red">
              <FaSearch className="h-5 w-5" />
            </span>
            {isDropdownOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-lg border border-my-light-gray bg-white p-3 shadow-lg">
                {isLoading ? (
                  <p className="text-sm text-gray-500">Searching...</p>
                ) : loadError ? (
                  <p className="text-sm text-red-600">{loadError}</p>
                ) : query.trim().length < 2 ? (
                  defaultBoxTypes.length === 0 ? (
                    <p className="text-sm text-gray-500">No box types found.</p>
                  ) : (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        box_types
                      </p>
                      <ul className="space-y-1">
                        {defaultBoxTypes.map((type) => (
                          <li key={type.id} className="text-sm text-black">
                            {type.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ) : boxTypes.length === 0 && boxTypeProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">No results found.</p>
                ) : (
                  <div className="space-y-3">
                    {boxTypes.length > 0 ? (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          box_types
                        </p>
                        <ul className="space-y-1">
                          {boxTypes.map((type) => (
                            <li key={type.id} className="text-sm text-black">
                              {type.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {boxTypeProducts.length > 0 ? (
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          box_type_products
                        </p>
                        <ul className="space-y-1">
                          {boxTypeProducts.map((product) => (
                            <li key={product.id} className="text-sm text-black">
                              {product.productName}{" "}
                              <span className="text-gray-500">
                                ({product.itemNo})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </form>
        </div>

        {/* Cart + User */}
        <div className="flex items-center justify-center gap-6 lg:gap-8 shrink-0">
          {/* Cart */}
          <Link
            href="/checkout"
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <span className="relative inline-block">
              <Image
                src="/svgs/cart.svg"
                alt=""
                width={64}
                height={64}
                className="h-6 w-6"
              />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-my-red text-[10px] font-bold text-white">
                1
              </span>
            </span>
            <span className="text-xs font-medium text-black">
              {t("header.cart")}
            </span>
            <span className="text-xs font-bold text-black">€ 300.00</span>
          </Link>

          {/* User */}
          <Link
            href="/account"
            className="flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/svgs/user.svg"
              alt=""
              width={64}
              height={64}
              className="h-6 w-6"
            />
            {language === "ro" ? (
              <>
                <span className="text-xs font-medium text-black">
                  {t("header.account")}
                </span>
                <span className="text-xs font-medium text-black">
                  {t("header.user").toLowerCase()}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-black">
                  {t("header.user")}
                </span>
                <span className="text-xs font-medium text-black">
                  {t("header.account")}
                </span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
