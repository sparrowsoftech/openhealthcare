import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { navigate } from "raviger";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import anaesthesiaApi, { AnaesthesiaWrite } from "@/types/ot/anaesthesiaApi";

interface Props {
  facilityId: string;
  anaesthesiaId?: string;
}

const initialForm: AnaesthesiaWrite = {
  anaesthesia_name: "",
  anaesthesia_code: "",
  description: "",
  status: "active",
};

export default function AnaesthesiaForm({ facilityId, anaesthesiaId }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(anaesthesiaId);

  const listPath = `/facility/${facilityId}/ot/anaesthesia`;

  const [form, setForm] = useState<AnaesthesiaWrite>(initialForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["anaesthesia-record", facilityId, anaesthesiaId],
    queryFn: query(anaesthesiaApi.get, {
      pathParams: {
        facilityId,
        id: anaesthesiaId!,
      },
    }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data) {
      setForm({
        anaesthesia_name: data.anaesthesia_name,
        anaesthesia_code: data.anaesthesia_code,
        description: data.description ?? "",
        status: data.status,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: AnaesthesiaWrite) => {
      if (isEdit) {
        return mutate(anaesthesiaApi.update, {
          pathParams: {
            facilityId,
            id: anaesthesiaId!,
          },
        })(payload);
      }

      return mutate(anaesthesiaApi.create, {
        pathParams: { facilityId },
      })(payload);
    },

    onSuccess: async () => {
      toast.success(
        isEdit
          ? "Anaesthesia method updated successfully"
          : "Anaesthesia method created successfully",
      );

      await queryClient.invalidateQueries({
        queryKey: ["anaesthesia", facilityId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["anaesthesia-record", facilityId, anaesthesiaId],
      });

      navigate(listPath);
    },

    onError: () => {
      toast.error(
        isEdit
          ? "Unable to update anaesthesia method."
          : "Unable to create anaesthesia method. Please check the details.",
      );
    },
  });

  const handleChange = (field: keyof AnaesthesiaWrite, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const anaesthesiaName = form.anaesthesia_name.trim();
    const anaesthesiaCode = form.anaesthesia_code.trim();

    if (!anaesthesiaName) {
      toast.error("Please enter anaesthesia name.");
      return;
    }

    if (!anaesthesiaCode) {
      toast.error("Please enter anaesthesia code.");
      return;
    }

    saveMutation.mutate({
      anaesthesia_name: anaesthesiaName,
      anaesthesia_code: anaesthesiaCode,
      description: form.description.trim(),
      status: form.status,
    });
  };

  if (isEdit && isLoading) {
    return <Loading />;
  }

  if (isEdit && (isError || !data)) {
    return (
      <Page title="Anaesthesia Master">
        <div className="space-y-4 p-4">
          <p className="text-red-600">
            Unable to load anaesthesia details. Please refresh the page or check
            your permissions.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(listPath)}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Anaesthesia List
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page title={isEdit ? "Edit Anaesthesia" : "Add Anaesthesia"}>
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(listPath)}
            aria-label="Back to anaesthesia list"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold">
              {isEdit ? "Edit Anaesthesia" : "Add Anaesthesia"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit
                ? "Update the anaesthesia method details."
                : "Add a new anaesthesia method to the master."}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Anaesthesia Details</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="anaesthesia_name"
                    className="text-sm font-medium"
                  >
                    Anaesthesia Name <span className="text-red-500">*</span>
                  </label>

                  <Input
                    id="anaesthesia_name"
                    name="anaesthesia_name"
                    value={form.anaesthesia_name}
                    onChange={(event) =>
                      handleChange("anaesthesia_name", event.target.value)
                    }
                    placeholder="e.g. General Anaesthesia"
                    maxLength={255}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="anaesthesia_code"
                    className="text-sm font-medium"
                  >
                    Anaesthesia Code <span className="text-red-500">*</span>
                  </label>

                  <Input
                    id="anaesthesia_code"
                    name="anaesthesia_code"
                    value={form.anaesthesia_code}
                    onChange={(event) =>
                      handleChange("anaesthesia_code", event.target.value)
                    }
                    placeholder="e.g. GA"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>

                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={(event) =>
                    handleChange("description", event.target.value)
                  }
                  placeholder="Enter anaesthesia method description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={(event) =>
                    handleChange("status", event.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(listPath)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? "Saving..."
                    : isEdit
                      ? "Update Anaesthesia"
                      : "Save Anaesthesia"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
