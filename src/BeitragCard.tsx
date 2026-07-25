import { Card, CardHeader, Avatar, IconButton, CardMedia, CardContent, Typography, CardActions, Badge, TextField, Tooltip } from "@mui/material";
import './BeitragCard.css';
import { Beitrag } from "./datenformat/Beitrag";
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from "@mui/icons-material/Save";
import { Person } from "./datenformat/Person";
import axios from "axios";
import EmpfaengerAuswahl from "./EmpfaengerAuswahl";
import { config } from "./config";

export type BeitragCardProps = {
  beitrag?: Beitrag;
  bearbeiten: boolean;
  setBearbeiten?: (b: boolean) => void;
  user?: Person;
  bild?: Blob;
  titel?: string;
  setTitel?: (t: string) => void;
  beschreibung?: string;
  setBeschreibung?: (t: string) => void;
  disabled?: boolean;
  setDisabled?: (b: boolean) => void;
  empfaenger?: Person[];
  setEmpfaenger?: (e: Person[]) => void;
  refetch: () => void;
  onClick?: () => void;
  token: string | null;
}

function BeitragCard(props: BeitragCardProps) {
  const beitrag = props.beitrag;
  const user = props.beitrag?.autor || props.user;
  const bild = (props.beitrag?.link && config.assetsUrl + '/' + props.beitrag?.link) || (props.bild && URL.createObjectURL(props.bild));

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
      const body = {
        link: bildUrl,
        titel: props.titel,
        beschreibung: props.beschreibung,
        autor: props.user,
        datum: new Date(),
        empfaenger: props.empfaenger || []
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
    <Card sx={{ maxWidth: 345 }} className="beitrag" key={beitrag?.id || "neu"}>
      <CardHeader
        avatar={
            user?.avatar_url ?
            <Avatar src={config.assetsUrl + '/' + user?.avatar_url}></Avatar> :
          <Avatar aria-label="recipe">
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
      <CardMedia
        component="img"
        image={bild}
        alt={beitrag?.titel}
        onClick={props.onClick}
      />
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
          </>}
      </CardContent>
      {beitrag && <CardActions disableSpacing>
        <Tooltip title={props.beitrag?.gefaellt?.map(p => p.name)?.join(', ')}>
          <IconButton onClick={like}>
          <Badge badgeContent={beitrag.gefaellt_num} color="primary">
              <ThumbUpAltIcon />
          </Badge>
          </IconButton>
        </Tooltip>
        <IconButton onClick={dislike}>
        <Badge badgeContent={beitrag.gefaellt_nicht_num} color="primary">
            <ThumbDownAltIcon />
        </Badge>
        </IconButton>
        <Tooltip title={props.beitrag?.angesehen?.map(p => p.name)?.join(', ')}>
          <IconButton>
          <Badge badgeContent={beitrag.angesehen_num} color="primary">
              <VisibilityIcon />
          </Badge>
          </IconButton>
        </Tooltip>
      </CardActions>
    }
    {props.bearbeiten && <IconButton onClick={() => save()} disabled={props.disabled}>
            <SaveIcon />
        </IconButton>}
    </Card>
    );
}

export default BeitragCard;