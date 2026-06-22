import { getAgencySettings } from "@/lib/data/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getAgencySettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Agency details shown across the public site."
      />
      <SettingsForm settings={settings} />
    </>
  );
}
