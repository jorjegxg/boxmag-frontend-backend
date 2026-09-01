"use client";

import {
  memo,
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  type AdminBoxType,
  useAdminBoxTypesStore,
} from "../use-admin-box-types-store";
import { useNotification } from "../../global/components/notification-center";
import { getBackendBaseUrl } from "../components/admin-types";
import {
  AdminBreadcrumb,
  Field,
  SectionTitle,
} from "../components/admin-ui";

export default function AdminBoxTypesPage() {
  const boxTypes = useAdminBoxTypesStore((state) => state.boxTypes);
  const isLoadingBoxTypes = useAdminBoxTypesStore(
    (state) => state.isLoadingBoxTypes,
  );
  const boxTypesError = useAdminBoxTypesStore((state) => state.boxTypesError);
  const saveError = useAdminBoxTypesStore((state) => state.saveError);
  const isSavingBoxType = useAdminBoxTypesStore(
    (state) => state.isSavingBoxType,
  );
  const setBackendBaseUrl = useAdminBoxTypesStore(
    (state) => state.setBackendBaseUrl,
  );
  const loadBoxTypes = useAdminBoxTypesStore((state) => state.loadBoxTypes);
  const createBoxType = useAdminBoxTypesStore((state) => state.createBoxType);
  const [boxTypeTitle, setBoxTypeTitle] = useState("");
  const [selectedBoxImageFiles, setSelectedBoxImageFiles] = useState<File[]>(
    [],
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    setBackendBaseUrl(backendBaseUrl);
  }, [backendBaseUrl, setBackendBaseUrl]);

  useEffect(() => {
    void loadBoxTypes();
  }, [loadBoxTypes]);

  const handleAddBoxType = async () => {
    const trimmedTitle = boxTypeTitle.trim();
    let uploadedImages: Array<{
      id: number;
      url: string;
      sortOrder: number;
      altText: string | null;
      isPrimary: boolean;
    }> = [];

    if (!trimmedTitle) {
      setFormError("Completează titlul.");
      return;
    }

    setFormError(null);

    if (selectedBoxImageFiles.length > 0) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        for (const file of selectedBoxImageFiles) {
          formData.append("images", file);
        }
        const uploadResponse = await fetch(
          `${backendBaseUrl}/api/box-types/upload-images`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          },
        );
        const uploadBody = (await uploadResponse.json()) as {
          ok?: boolean;
          data?: { images?: Array<{ url?: string }> };
          message?: string;
        };

        if (
          !uploadResponse.ok ||
          uploadBody.ok !== true ||
          !Array.isArray(uploadBody.data?.images) ||
          uploadBody.data.images.length === 0
        ) {
          throw new Error(uploadBody.message ?? "Încărcarea imaginii a eșuat");
        }

        uploadedImages = uploadBody.data.images
          .map((image, index) => {
            const url = String(image.url ?? "").trim();
            if (!url) return null;
            return {
              id: index + 1,
              url,
              sortOrder: index,
              altText: null,
              isPrimary: index === 0,
            };
          })
          .filter((image): image is NonNullable<typeof image> => image != null);
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Încărcarea imaginii a eșuat. Încearcă din nou.",
        );
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    if (uploadedImages.length === 0) {
      setFormError("Alege o imagine pentru cutie înainte de adăugare.");
      return;
    }

    await createBoxType({
      title: trimmedTitle,
      images: uploadedImages,
      isActive: true,
    });

    const latestSaveError = useAdminBoxTypesStore.getState().saveError;
    if (!latestSaveError) {
      setBoxTypeTitle("");
      setSelectedBoxImageFiles([]);
    }
  };

  return (
    <div>
      <AdminBreadcrumb current="Tipuri de cutii și prețuri" />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle title="Gestionare tipuri de cutii" />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field
                label="Titlu"
                placeholder="ex. Boxfix Premium 500"
                value={boxTypeTitle}
                onChange={setBoxTypeTitle}
              />
              <ImagePickerField
                label="Imagini cutie"
                selectedFiles={selectedBoxImageFiles}
                onFileChange={setSelectedBoxImageFiles}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAddBoxType()}
                disabled={
                  isSavingBoxType ||
                  isUploadingImage ||
                  selectedBoxImageFiles.length === 0
                }
                className="bg-my-yellow hover:bg-my-yellow-bright text-black font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {isUploadingImage
                  ? "Se încarcă imaginea..."
                  : isSavingBoxType
                    ? "Se adaugă..."
                    : "Adaugă tip de cutie"}
              </button>
            </div>
            {formError ? (
              <p className="text-sm text-red-600">{formError}</p>
            ) : null}

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Titlu
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Fotografie
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingBoxTypes ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={5}>
                          Se încarcă tipurile de cutii...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingBoxTypes && boxTypesError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={5}>
                          Eroare la încărcarea tipurilor de cutii:{" "}
                          {boxTypesError}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingBoxTypes &&
                    !boxTypesError &&
                    boxTypes.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={5}>
                          Nu există tipuri de cutii.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingBoxTypes && !boxTypesError
                      ? boxTypes.map((boxType) => (
                          <BoxTypeRow key={boxType.id} boxType={boxType} />
                        ))
                      : null}
                    {saveError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={5}>
                          Eroare la salvarea tipului de cutie: {saveError}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const BoxTypeRow = memo(function BoxTypeRow({
  boxType,
}: {
  boxType: AdminBoxType;
}) {
  const { notify } = useNotification();
  const deactivateBoxType = useAdminBoxTypesStore(
    (state) => state.deactivateBoxType,
  );
  const activateBoxType = useAdminBoxTypesStore(
    (state) => state.activateBoxType,
  );
  const statusUpdatingBoxId = useAdminBoxTypesStore(
    (state) => state.statusUpdatingBoxId,
  );
  const isUpdatingStatus = statusUpdatingBoxId === boxType.id;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Ascunzi „${boxType.title}” din magazin? Tipul de cutie rămâne în baza de date, dar va fi marcat ca inactiv.`,
    );
    if (!confirmed) return;

    try {
      await deactivateBoxType(boxType.id);
      notify({
        type: "success",
        message: `„${boxType.title}” a fost ascuns din magazin.`,
      });
    } catch (error) {
      notify({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nu s-a putut ascunde tipul de cutie",
      });
    }
  };

  const handleActivate = async () => {
    try {
      await activateBoxType(boxType.id);
      notify({
        type: "success",
        message: `„${boxType.title}” este din nou activ în magazin.`,
      });
    } catch (error) {
      notify({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nu s-a putut activa tipul de cutie",
      });
    }
  };

  const primaryImage =
    boxType.images.find((image) => image.isPrimary) ??
    boxType.images[0] ??
    null;

  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-3">{boxType.id}</td>
      <td className="px-4 py-3">{boxType.title}</td>
      <td className="px-4 py-3">
        <img
          src={primaryImage?.url ?? "/placeholders/box4.png"}
          alt={boxType.title}
          className="h-12 w-12 rounded-md border border-gray-200 object-cover"
        />
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            boxType.isActive
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {boxType.isActive ? "Activ" : "Inactiv"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/box-types/${boxType.id}/edit`}
            className="inline-flex rounded-md bg-my-yellow px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-my-yellow-bright"
          >
            Editează
          </Link>
          {boxType.isActive ? (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => void handleDelete()}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isUpdatingStatus ? "Se ascunde..." : "Ascunde"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => void handleActivate()}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {isUpdatingStatus ? "Se activează..." : "Activează"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

function ImagePickerField({
  label,
  selectedFiles,
  onFileChange,
}: {
  label: string;
  selectedFiles: File[];
  onFileChange: (files: File[]) => void;
}) {
  const inputId = "box-image-upload";
  const previewUrl = useMemo(() => {
    if (selectedFiles.length === 0) return "";
    return URL.createObjectURL(selectedFiles[0]);
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <FilePickerInput
        inputId={inputId}
        selectedFileName={selectedFiles.map((file) => file.name).join(", ")}
        onChange={(event) => onFileChange(Array.from(event.target.files ?? []))}
      />
      {selectedFiles.length > 0 ? (
        <span className="text-xs text-gray-600 truncate">
          {selectedFiles.length} fișier(e) selectat(e)
        </span>
      ) : (
        <span className="text-xs text-gray-400">Nicio imagine selectată</span>
      )}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Previzualizare cutie selectată"
          className="h-16 w-16 rounded-md border border-gray-200 object-cover"
        />
      ) : null}
    </label>
  );
}

function FilePickerInput({
  inputId,
  selectedFileName,
  onChange,
  wrapperClassName = "h-11",
}: {
  inputId: string;
  selectedFileName: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  wrapperClassName?: string;
}) {
  return (
    <div
      className={`flex items-center rounded-lg border border-gray-300 bg-white px-2 ${wrapperClassName}`}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        className="hidden"
      />
      <label
        htmlFor={inputId}
        className="inline-flex h-8 cursor-pointer items-center rounded-md bg-my-light-gray2 px-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200"
      >
        Alege fișier
      </label>
      <span className="ml-3 truncate text-sm text-gray-700">
        {selectedFileName ? selectedFileName : "Niciun fișier ales"}
      </span>
    </div>
  );
}
