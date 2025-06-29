import { Suspense } from "react";
import SearchResults from "@/components/SearchResults";
import Spinner from "@/components/Spinner";

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <SearchResults />
        </Suspense>
      </div>
    </div>
  );
}