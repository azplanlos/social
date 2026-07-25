import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Token({ setToken }: { setToken: (token: string) => void }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    const accessTokenRegex = /access_token=([^&]+)/;
    const isMatch = window.location.href.match(accessTokenRegex);

    if (isMatch) {
      const accessToken = isMatch[1];
      setToken(accessToken);
      navigate("/secure");
    }
  }, []);

  return <></>;
}