import { useSeoMeta } from "@unhead/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { SpookstrHeader } from "@/components/SpookstrHeader";
import { Button } from "@/components/ui/button";
import { Ghost } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useSeoMeta({
    title: "404 - Page Not Found",
    description: "The page you are looking for could not be found. Return to the home page to continue browsing.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <Ghost className="h-24 w-24 text-lime-500/40 mx-auto animate-pulse" />
          <h1 className="text-6xl font-bold text-lime-400">404</h1>
          <p className="text-2xl text-lime-100">Lost in the Void</p>
          <p className="text-lime-500/60 max-w-md mx-auto">
            The page you're looking for has vanished into the paranormal realm.
            Perhaps it was never meant to be found...
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
          >
            Return to Safety
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
