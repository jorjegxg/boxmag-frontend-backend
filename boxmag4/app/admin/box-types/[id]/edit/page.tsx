"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { B2b } from "../../../../global/components/b2b";
import { useAdminBoxTypesStore } from "../../../use-admin-box-types-store";

export default function EditBoxTypePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const boxTypeId = Number(params.id);

  const boxTypes = useAdminBoxTypesStore((state) => state.boxTypes);
  const isLoadingBoxTypes = useAdminBoxTypesStore((state) => state.isLoadingBoxTypes);
  const boxTypesError = useAdminBoxTypesStore((state) => state.boxTypesError);
  const setBackendBaseUrl = useAdminBoxTypesStore((state) => state.setBackendBaseUrl);
  const loadBoxTypes = useAdminBoxTypesStore((state) => state.loadBoxTypes);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    setBackendBaseUrl(backendBaseUrl);
    void loadBoxTypes();
  }, [backendBaseUrl, loadBoxTypes, setBackendBaseUrl]);

  const boxType = boxTypes.find((item) => item.id === boxTypeId);

  const [title, setTitle] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedImageFileName, setSelectedImageFileName] = useState<string | null>(null);
  const [previewImagePath, setPreviewImagePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!boxType) return;
    setTitle(boxType.title);
    setImagePath(boxType.imagePath);
    setPreviewImagePath(boxType.imagePath);
    setIsActive(boxType.isActive);
  }, [boxType]);

  useEffect(() => {
    return () => {
      if (previewImagePath?.startsWith("blob:")) {
        URL.revokeObjectURL(previewImagePath);
      }
    };
  }, [previewImagePath]);

  async function handleSave() {
    if (!boxType) return;

    const trimmedTitle = title.trim();
    const trimmedImagePath = imagePath.trim();

    if (!trimmedTitle || !trimmedImagePath) {
      setSaveError("Name and photo are required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types/${boxType.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          imagePath: trimmedImagePath,
          isActive,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      await loadBoxTypes();
      router.push("/admin");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save box type");
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImageFileName(file?.name ?? null);

    if (previewImagePath?.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagePath);
    }

    if (!file) {
      setPreviewImagePath(imagePath);
      return;
    }

    setPreviewImagePath(URL.createObjectURL(file));
  }

  const showNotFound = !isLoadingBoxTypes && !boxTypesError && Number.isInteger(boxTypeId) && !boxType;

  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Edit Box Type</span>
        </div>
      </section>

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <div className="bg-my-red w-full px-6 py-4 text-my-white">
            <h1 className="text-lg font-bold">Edit Box Type</h1>
          </div>

          <div className="p-6 lg:p-8 space-y-6">
            {!Number.isInteger(boxTypeId) || boxTypeId <= 0 ? (
              <p className="text-red-600">Invalid box type id.</p>
            ) : null}
            {isLoadingBoxTypes ? <p className="text-gray-600">Loading box type...</p> : null}
            {boxTypesError ? <p className="text-red-600">Failed to load: {boxTypesError}</p> : null}
            {showNotFound ? <p className="text-red-600">Box type not found.</p> : null}

            {boxType ? (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Name</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Status</span>
                  <select
                    value={isActive ? "active" : "draft"}
                    onChange={(event) => setIsActive(event.target.value === "active")}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Photo URL</span>
                  <input
                    type="text"
                    value={imagePath}
                    onChange={(event) => {
                      setImagePath(event.target.value);
                      if (!selectedImageFileName) {
                        setPreviewImagePath(event.target.value);
                      }
                    }}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">Photo Upload (Preview only)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-my-light-gray2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-200"
                  />
                  <span className="text-xs text-gray-500">
                    {selectedImageFileName
                      ? `Selected: ${selectedImageFileName}`
                      : "Image upload is preview-only; save uses the Photo URL value."}
                  </span>
                </label>

                {previewImagePath ? (
                  <img
                    src={previewImagePath}
                    alt={title || "Box type preview"}
                    className="h-28 w-28 rounded-md border border-gray-200 object-cover"
                  />
                ) : null}

                {saveError ? <p className="text-red-600">{saveError}</p> : null}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <Link
                    href="/admin"
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
