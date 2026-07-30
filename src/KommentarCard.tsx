import { useState } from "react";
import { Box, Avatar, IconButton, Badge, Typography } from "@mui/material";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ReplyIcon from "@mui/icons-material/Reply";
import axios from "axios";
import { Kommentar } from "./datenformat/Kommentar";
import { Person } from "./datenformat/Person";
import { config } from "./config";
import KommentarEingabe from "./KommentarEingabe";

type KommentarCardProps = {
    kommentar: Kommentar;
    antworten: Kommentar[];
    alleKommentare: Map<string | null, Kommentar[]>;
    token: string | null;
    user?: Person;
    refetch: () => void;
    tiefe: number;
    istEigenerBeitrag?: boolean;
};

function KommentarCard(props: KommentarCardProps) {
    const [antwortSichtbar, setAntwortSichtbar] = useState(false);
    const { kommentar, antworten, alleKommentare, token, user, refetch, tiefe, istEigenerBeitrag } = props;

    const hatGeliked = kommentar.likes?.some((p) => p.name === user?.name) ?? false;

    function handleLike() {
        axios
            .post(`/kommentar/${kommentar.id}/like`, null, {
                headers: {
                    Authorization: "Bearer " + token,
                    "X-Requested-With": "XMLHttpRequest",
                },
                withCredentials: true,
            })
            .then(() => refetch());
    }

    return (
        <Box sx={{ marginLeft: `${tiefe * 24}px`, marginTop: "8px" }}>
            <Box
                sx={{
                    background: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(16px) saturate(140%)",
                    WebkitBackdropFilter: "blur(16px) saturate(140%)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                }}
            >
                {/* Header: Avatar + Name + Datum */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginBottom: "8px" }}>
                    {kommentar.autor?.avatar_url ? (
                        <Avatar
                            src={config.assetsUrl + "/" + kommentar.autor.avatar_url}
                            sx={{ width: 32, height: 32 }}
                        />
                    ) : (
                        <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem" }}>
                            {kommentar.autor?.name}
                        </Avatar>
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {kommentar.autor?.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", marginLeft: "auto" }}>
                        {new Date(kommentar.datum).toLocaleString()}
                    </Typography>
                </Box>

                {/* Kommentartext */}
                <Typography variant="body2" sx={{ marginBottom: "8px" }}>
                    {kommentar.text}
                </Typography>

                {/* Aktionen: Like + Antworten */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton onClick={handleLike} size="small">
                        <Badge badgeContent={kommentar.likes_num} color="primary">
                            <ThumbUpAltIcon
                                fontSize="small"
                                color={hatGeliked ? "primary" : "inherit"}
                            />
                        </Badge>
                    </IconButton>
                    {!istEigenerBeitrag && (
                        <>
                            <IconButton
                                onClick={() => setAntwortSichtbar(!antwortSichtbar)}
                                size="small"
                            >
                                <ReplyIcon fontSize="small" />
                            </IconButton>
                            <Typography
                                variant="caption"
                                sx={{ cursor: "pointer", color: "text.secondary" }}
                                onClick={() => setAntwortSichtbar(!antwortSichtbar)}
                            >
                                Antworten
                            </Typography>
                        </>
                    )}
                </Box>

                {/* Antwort-Eingabefeld (Toggle) */}
                {antwortSichtbar && !istEigenerBeitrag && (
                    <Box sx={{ marginTop: "8px" }}>
                        <KommentarEingabe
                            beitragId={kommentar.beitragId}
                            elternKommentarId={kommentar.id}
                            token={token}
                            onKommentarErstellt={() => {
                                setAntwortSichtbar(false);
                                refetch();
                            }}
                        />
                    </Box>
                )}
            </Box>

            {/* Rekursiv Kind-Kommentare rendern */}
            {antworten.map((antwort) => (
                <KommentarCard
                    key={antwort.id}
                    kommentar={antwort}
                    antworten={alleKommentare.get(antwort.id) || []}
                    alleKommentare={alleKommentare}
                    token={token}
                    user={user}
                    refetch={refetch}
                    tiefe={tiefe + 1}
                    istEigenerBeitrag={istEigenerBeitrag}
                />
            ))}
        </Box>
    );
}

export default KommentarCard;
