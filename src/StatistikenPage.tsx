import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CircularProgress,
    Container,
    CssBaseline,
    IconButton,
    Typography,
    Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { useNavigate } from 'react-router';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

export type StatistikenPageProps = {
    token: string | null;
};

interface Statistics {
    totalBeitraege: number;
    totalUsers: number;
    totalLikes: number;
    totalDislikes: number;
    totalViews: number;
    beitraegeProTag: { datum: string; anzahl: number }[];
    topBeitraege: { titel: string; likes: number; dislikes: number; views: number }[];
    aktivsteNutzer: { name: string; beitraege: number }[];
    engagementProTag: { datum: string; likes: number; dislikes: number; views: number }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c43', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'];

// Liquid Glass Card Style
const glassCardSx = {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
    color: '#fff',
};

const statBoxSx = {
    ...glassCardSx,
    p: { xs: 1.5, sm: 2 },
    textAlign: 'center' as const,
};

export default function StatistikenPage({ token }: StatistikenPageProps) {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        axios.get<Statistics>('/statistiken', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Authorization: 'Bearer ' + token,
            },
            withCredentials: true,
        })
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                setError('Statistiken konnten nicht geladen werden.');
                setLoading(false);
            });
    }, [token]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress sx={{ color: '#fff' }} />
            </Box>
        );
    }

    if (error || !stats) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Typography color="error">{error || 'Unbekannter Fehler'}</Typography>
            </Container>
        );
    }

    // Datum-Label kürzen (nur Tag.Monat)
    const formatDatum = (datum: string) => {
        const parts = datum.split('-');
        return `${parts[2]}.${parts[1]}`;
    };

    const beitraegeProTagFormatted = stats.beitraegeProTag.map(d => ({
        ...d,
        label: formatDatum(d.datum),
    }));

    const engagementFormatted = stats.engagementProTag.map(d => ({
        ...d,
        label: formatDatum(d.datum),
    }));

    return (
        <>
            <CssBaseline />
            <Container maxWidth="md" sx={{ pt: 2, pb: 4, px: { xs: 1, sm: 3 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ color: '#fff', mr: 1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
                        Statistiken
                    </Typography>
                </Box>

                {/* Überblick-Karten */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5, mb: 4 }}>
                    <Box sx={statBoxSx}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.totalBeitraege}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Beiträge</Typography>
                    </Box>
                    <Box sx={statBoxSx}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.totalUsers}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Nutzer</Typography>
                    </Box>
                    <Box sx={statBoxSx}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.totalLikes}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Likes</Typography>
                    </Box>
                    <Box sx={statBoxSx}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.totalDislikes}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Dislikes</Typography>
                    </Box>
                    <Box sx={{ ...statBoxSx, gridColumn: { xs: 'span 2', sm: 'auto' } }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.totalViews}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Aufrufe</Typography>
                    </Box>
                </Box>

                {/* Beiträge pro Tag - Linien-Diagramm */}
                <Card sx={{ ...glassCardSx, mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Beiträge pro Tag (letzte 30 Tage)
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={beitraegeProTagFormatted}>
                                <defs>
                                    <linearGradient id="colorBeitraege" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="label" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.7)" allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(30,30,60,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="anzahl" stroke="#8884d8" fill="url(#colorBeitraege)" name="Beiträge" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Engagement pro Tag - Linien-Diagramm */}
                <Card sx={{ ...glassCardSx, mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Engagement pro Tag (letzte 30 Tage)
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={engagementFormatted}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="label" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.7)" allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(30,30,60,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ color: '#fff' }} />
                                <Line type="monotone" dataKey="likes" stroke="#82ca9d" strokeWidth={2} name="Likes" dot={false} />
                                <Line type="monotone" dataKey="dislikes" stroke="#ff7c43" strokeWidth={2} name="Dislikes" dot={false} />
                                <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} name="Aufrufe" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Beiträge - Balken-Diagramm */}
                <Card sx={{ ...glassCardSx, mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Top 5 Beiträge nach Likes
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.topBeitraege} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="rgba(255,255,255,0.7)" allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="titel"
                                    stroke="rgba(255,255,255,0.7)"
                                    width={100}
                                    fontSize={11}
                                    tickFormatter={(value: string) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                                />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(30,30,60,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ color: '#fff' }} />
                                <Bar dataKey="likes" fill="#82ca9d" name="Likes" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="dislikes" fill="#ff7c43" name="Dislikes" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="views" fill="#8884d8" name="Aufrufe" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Aktivste Nutzer - Balken-Diagramm */}
                <Card sx={{ ...glassCardSx, mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Aktivste Nutzer
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.aktivsteNutzer}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.7)" allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(30,30,60,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
                                />
                                <Bar dataKey="beitraege" fill="#8884d8" name="Beiträge" radius={[4, 4, 0, 0]}>
                                    {stats.aktivsteNutzer.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Like/Dislike Verhältnis - Pie Chart */}
                <Card sx={{ ...glassCardSx, mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Like / Dislike Verhältnis
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Likes', value: stats.totalLikes },
                                        { name: 'Dislikes', value: stats.totalDislikes },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    <Cell fill="#82ca9d" />
                                    <Cell fill="#ff7c43" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'rgba(30,30,60,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff' }}
                                />
                                <Legend wrapperStyle={{ color: '#fff' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </Container>
        </>
    );
}
