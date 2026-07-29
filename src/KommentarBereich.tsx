import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import axios from "axios";
import { Kommentar } from "./datenformat/Kommentar";
import { Person } from "./datenformat/Person";
import KommentarCard from "./KommentarCard";
import KommentarEingabe from "./KommentarEingabe";

type KommentarBereichProps = {
    beitragId: string;
    token: string | null;
    user?: Person;
};

function KommentarBereich(props: KommentarBereichProps) {
    const [kommentare, setKommentare] = useState<Kommentar[]>([]);

    function fetchKommentare() {
        axios
            .get<Kommentar[]>(`/beitrag/${props.beitragId}/kommentare`, {
                headers: {
                    Authorization: "Bearer " + props.token,
                    "X-Requested-With": "XMLHttpRequest",
                },
                withCredentials: true,
            })
            .then((response) => {
                setKommentare(response.data);
            });
    }

    useEffect(() => {
        fetchKommentare();
    }, [props.beitragId]);

    // Baumstruktur aufbauen: Gruppiere nach elternKommentarId
    const kommentarBaum = new Map<string | null, Kommentar[]>();
    kommentare.forEach((k) => {
        const parentId = k.elternKommentarId || null;
        if (!kommentarBaum.has(parentId)) {
            kommentarBaum.set(parentId, []);
        }
        kommentarBaum.get(parentId)!.push(k);
    });

    const topLevelKommentare = kommentarBaum.get(null) || [];

    return (
        <Box sx={{ marginTop: "12px" }}>
            {kommentare.length === 0 ? (
                <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", textAlign: "center", padding: "16px 0" }}
                >
                    Noch keine Kommentare
                </Typography>
            ) : (
                topLevelKommentare.map((kommentar) => (
                    <KommentarCard
                        key={kommentar.id}
                        kommentar={kommentar}
                        antworten={kommentarBaum.get(kommentar.id) || []}
                        alleKommentare={kommentarBaum}
                        token={props.token}
                        user={props.user}
                        refetch={fetchKommentare}
                        tiefe={0}
                    />
                ))
            )}

            <Box sx={{ marginTop: "12px" }}>
                <KommentarEingabe
                    beitragId={props.beitragId}
                    token={props.token}
                    onKommentarErstellt={fetchKommentare}
                />
            </Box>
        </Box>
    );
}

export default KommentarBereich;
