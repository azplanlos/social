import { useState } from "react";
import { Box, TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import axios from "axios";

type KommentarEingabeProps = {
    beitragId: string;
    elternKommentarId?: string | null;
    token: string | null;
    onKommentarErstellt: () => void;
};

function KommentarEingabe(props: KommentarEingabeProps) {
    const [text, setText] = useState("");

    function handleSubmit() {
        if (!text.trim()) return;

        axios
            .post(
                `/beitrag/${props.beitragId}/kommentar`,
                {
                    text: text,
                    elternKommentarId: props.elternKommentarId || null,
                },
                {
                    headers: {
                        Authorization: "Bearer " + props.token,
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    withCredentials: true,
                }
            )
            .then(() => {
                setText("");
                props.onKommentarErstellt();
            });
    }

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "16px",
                padding: "8px 12px",
            }}
        >
            <TextField
                fullWidth
                size="small"
                placeholder="Kommentar schreiben..."
                variant="standard"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
            />
            <IconButton
                onClick={handleSubmit}
                disabled={!text.trim()}
                color="primary"
                size="small"
            >
                <SendIcon />
            </IconButton>
        </Box>
    );
}

export default KommentarEingabe;
