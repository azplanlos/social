import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Token({ setToken }: { setToken: (token: string) => void }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
      setToken(accessToken);
      navigate("/secure");
    }
  }, [navigate, setToken]);

  return <></>;
}