"use client";

import { PageHeader } from "@/components/ui/primitives";
import { NoData } from "@/components/ui/no-data";

/**
 * The prototype walked through picking a file, mapping its columns and
 * validating 4,318 invented rows against an importer that does not exist.
 * Until there is somewhere for data to land, the page says so.
 */
export function PageUpload() {
  return (
    <div className="flex flex-col gap-5.5 px-4 pb-12 pt-7 sm:px-8">
      <PageHeader kicker={<>DATA &middot; UPLOAD</>} title="Upload data" />
      <NoData
        icon="upload"
        title="No ingestion pipeline connected"
        what="Importing needs somewhere to write to and something to validate against: a store for the rows, a schema per metric group, and a job to fold new observations into the derived series. None of that exists yet, so there is no import to run."
        needs="storage + validation + ETL trigger"
      />
    </div>
  );
}
