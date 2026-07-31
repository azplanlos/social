import { useRef, useState } from "react";
import { Card, CardHeader, Avatar, IconButton, CardMedia, CardContent, Typography, CardActions, Badge, TextField, Tooltip, Box, Collapse, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import './BeitragCard.css';
import { Beitrag, BeitragTyp } from "./datenformat/Beitrag";
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ShareIcon from '@mui/icons-material/Share';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from "@mui/icons-material/Save";
import { Person } from "./datenformat/Person";
import axios from "axios";
import EmpfaengerAuswahl from "./EmpfaengerAuswahl";
import KommentarBereich from "./KommentarBereich";
import WeiterleitenDialog from "./WeiterleitenDialog";
import { config } from "./config";
import { useNavigate } from "react-router";

export type BeitragCardProps = {
  beitrag?: Beitrag;
  bearbeiten: boolean;
  setBearbeiten?: (b: boolean) => void;
  user?: Person;
  bild?: Blob;
  istVideo?: boolean;
  titel?: string;
  setTitel?: (t: string) => void;
  beschreibung?: string;
  setBeschreibung?: (t: string) => void;
  disabled?: boolean;
  setDisabled?: (b: boolean) => void;
  empfaenger?: Person[];
  setEmpfaenger?: (e: Person[]) => void;
  sichtbarkeitsDauer?: string;
  setSichtbarkeitsDauer?: (d: string) => void;
  refetch: () => void;
  onClick?: () => void;
  token: string | null;
}

function BeitragCard(props: BeitragCardProps) {
  const [kommentareSichtbar, setKommentareSichtbar] = useState(false);
  const [weiterleitenOpen, setWeiterleitenOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const beitrag = props.beitrag;
  const user = props.beitrag?.autor || props.user;
  const mediaUrl = (props.beitrag?.link ? config.assetsUrl + '/' + props.beitrag.link : undefined) || (props.bild ? URL.createObjectURL(props.bild) : undefined);
  const bild = mediaUrl;
  // Erkennen ob es ein Video ist (aus Beitrag-Typ oder aus istVideo-Prop oder aus Dateiendung)
  const isVideo = props.istVideo || props.beitrag?.typ === BeitragTyp.VIDEO ||
    (props.beitrag?.link && /\.(mp4|webm|mov|avi|mkv)$/i.test(props.beitrag.link));
  const istEigenerBeitrag = beitrag?.autor?.name != null && beitrag.autor.name === props.user?.name;

  function toggleVideo() {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setVideoPlaying(false);
      }
    }
  }

  function save(): void {
    props.setDisabled!(true);
    console.log(bild);
    const formData = new FormData();
    formData.append("file", props.bild!);
    axios.post("/foto", formData, {
        headers: {
            'content-type': 'multipart/form-data',
            Authorization: 'Bearer ' + props.token,
            "X-Requested-With": 'XMLHttpRequest'
         },
         withCredentials: true
        }
    ).then(response => {
      console.log(response.status);
      const bildUrl = response.data;
      // Ablaufdatum berechnen
      let ablaufDatum: Date | undefined = undefined;
      if (props.sichtbarkeitsDauer && props.sichtbarkeitsDauer !== 'unbegrenzt') {
        const jetzt = new Date();
        const stunden = parseInt(props.sichtbarkeitsDauer);
        ablaufDatum = new Date(jetzt.getTime() + stunden * 60 * 60 * 1000);
      }
      const body = {
        link: bildUrl,
        titel: props.titel,
        beschreibung: props.beschreibung,
        autor: props.user,
        datum: new Date(),
        empfaenger: props.empfaenger || [],
        ablaufDatum: ablaufDatum,
        typ: props.istVideo ? 'VIDEO' : 'FOTO'
      } as Beitrag;
      return axios.post('/beitrag', body, {
        headers: { "X-Requested-With": 'XMLHttpRequest',
          Authorization: 'Bearer ' + props.token
         },
         withCredentials: true
      });
    }).then(result => {
      props.setDisabled!(false);
      props.setBearbeiten!(false);
      props.setTitel!("");
      props.setBeschreibung!("");
    });
  }

  function like() {
    axios.post("/beitrag/" + beitrag!.id + "/like", null, {
      headers: { "X-Requested-With": 'XMLHttpRequest',
        Authorization: 'Bearer ' + props.token
       },
       withCredentials: true
    }).then(result => props.refetch());
  }

  function dislike() {
    axios.post("/beitrag/" + beitrag!.id + "/dislike", null, {
      headers: { "X-Requested-With": 'XMLHttpRequest',
        Authorization: 'Bearer ' + props.token
       },
       withCredentials: true
    }).then(result => props.refetch());
  }

  return(
    <Card sx={{ 
      width: '100%',
      maxWidth: { xs: '100%', sm: 345 },
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(16px) saturate(140%)',
      WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      }
    }} className="beitrag" key={beitrag?.id || "neu"}>
      <CardHeader
        avatar={
            user?.avatar_url ?
            <Avatar
              src={config.assetsUrl + '/' + user?.avatar_url}
              onClick={() => user?.name && navigate(`/user/${encodeURIComponent(user.name)}`)}
              sx={{ cursor: 'pointer' }}
            /> :
          <Avatar
            aria-label="recipe"
            onClick={() => user?.name && navigate(`/user/${encodeURIComponent(user.name)}`)}
            sx={{ cursor: 'pointer' }}
          >
            {user?.name}
          </Avatar>
        }
        action={
          <IconButton aria-label="settings">
          </IconButton>
        }
        title={beitrag?.titel || 'Neuer Beitrag'}
        subheader={(beitrag?.datum && new Date(beitrag?.datum).toLocaleString()) || new Date().toLocaleString()}
      />
      {isVideo ? (
        <Box sx={{ position: 'relative', margin: '0 8px', width: 'calc(100% - 16px)', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }} onClick={toggleVideo}>
          <video
            ref={videoRef}
            src={mediaUrl}
            style={{ width: '100%', display: 'block', borderRadius: '8px' }}
            playsInline
            preload="metadata"
          />
          {!videoPlaying && (
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayArrowIcon sx={{ color: 'white', fontSize: 40 }} />
            </Box>
          )}
        </Box>
      ) : (
        <CardMedia
          component="img"
          image={bild}
          alt={beitrag?.titel}
          onClick={props.onClick}
          sx={{ borderRadius: '8px', margin: '0 8px', width: 'calc(100% - 16px)' }}
        />
      )}
      <CardContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {beitrag?.beschreibung}
        </Typography>
          {props.bearbeiten && <>
            <TextField id="standard-basic" label="Titel" variant="standard" fullWidth value={props.titel} onChange={(t) => {
              if (props.setTitel) {
                props?.setTitel(t.target.value);
              }
             }} disabled={props.disabled} /><p></p>
            <TextField id="standard-basic" label="Beschreibung" variant="standard" fullWidth multiline value={props.beschreibung} onChange={(t) => {
              if (props.setBeschreibung) {
                props?.setBeschreibung(t.target.value);
              }
             }} disabled={props.disabled} />
            {props.setEmpfaenger && (
              <EmpfaengerAuswahl
                token={props.token}
                empfaenger={props.empfaenger || []}
                setEmpfaenger={props.setEmpfaenger}
              />
            )}
            {props.setSichtbarkeitsDauer && (
              <FormControl fullWidth variant="standard" sx={{ mt: 2 }}>
                <InputLabel id="sichtbarkeit-dauer-label">Sichtbarkeitsdauer</InputLabel>
                <Select
                  labelId="sichtbarkeit-dauer-label"
                  value={props.sichtbarkeitsDauer || 'unbegrenzt'}
                  onChange={(e) => props.setSichtbarkeitsDauer!(e.target.value)}
                  label="Sichtbarkeitsdauer"
                >
                  <MenuItem value="unbegrenzt">Unbegrenzt</MenuItem>
                  <MenuItem value="1">1 Stunde</MenuItem>
                  <MenuItem value="6">6 Stunden</MenuItem>
                  <MenuItem value="12">12 Stunden</MenuItem>
                  <MenuItem value="24">24 Stunden</MenuItem>
                  <MenuItem value="48">2 Tage</MenuItem>
                  <MenuItem value="168">1 Woche</MenuItem>
                  <MenuItem value="720">30 Tage</MenuItem>
                </Select>
              </FormControl>
            )}
          </>}
      </CardContent>
      {beitrag && <CardActions disableSpacing>
        <Tooltip title={props.beitrag?.gefaellt?.map(p => p.name)?.join(', ')}>
          <span>
          <IconButton onClick={like} disabled={istEigenerBeitrag}>
          <Badge badgeContent={beitrag.gefaellt_num} color="primary">
              <ThumbUpAltIcon color={beitrag.gefaellt?.some(p => p.name === props.user?.name) ? "primary" : "inherit"} />
          </Badge>
          </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={props.beitrag?.gefaellt_nicht?.map(p => p.name)?.join(', ')}>
          <span>
          <IconButton onClick={dislike} disabled={istEigenerBeitrag}>
          <Badge badgeContent={beitrag.gefaellt_nicht_num} color="primary">
              <ThumbDownAltIcon color={beitrag.gefaellt_nicht?.some(p => p.name === props.user?.name) ? "error" : "inherit"} />
          </Badge>
          </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={props.beitrag?.angesehen?.map(p => p.name)?.join(', ')}>
          <IconButton>
          <Badge badgeContent={beitrag.angesehen_num} color="primary">
              <VisibilityIcon />
          </Badge>
          </IconButton>
        </Tooltip>
        <IconButton onClick={() => setKommentareSichtbar(!kommentareSichtbar)}>
            <ChatBubbleOutlineIcon color={kommentareSichtbar ? "primary" : "inherit"} />
        </IconButton>
        <Tooltip title="Weiterleiten">
          <IconButton onClick={() => setWeiterleitenOpen(true)}>
            <ShareIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    }
    {beitrag && (
        <Collapse in={kommentareSichtbar}>
            <Box sx={{ padding: '8px 16px 16px' }}>
                <KommentarBereich
                    beitragId={beitrag.id}
                    token={props.token}
                    user={props.user}
                    istEigenerBeitrag={istEigenerBeitrag}
                />
            </Box>
        </Collapse>
    )}
    {props.bearbeiten && <IconButton onClick={() => save()} disabled={props.disabled}>
            <SaveIcon />
        </IconButton>}
    {beitrag && (
      <WeiterleitenDialog
        open={weiterleitenOpen}
        onClose={() => setWeiterleitenOpen(false)}
        beitrag={beitrag}
        token={props.token}
      />
    )}
    </Card>
    );
}

export default BeitragCard;