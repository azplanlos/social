import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Token({ setToken }: { setToken: (token: string) => void }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state');

    if (accessToken) {
      setToken(accessToken);

      // Navigate to the path encoded in the state parameter (deep link support)
      if (state) {
        const targetPath = decodeURIComponent(state);
        navigate(targetPath);
      } else {
        navigate("/secure");
      }
    }
  }, [navigate, setToken]);

  return <></>;
}
