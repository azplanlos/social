import { Person } from "./Person";

export class Beitrag {
    id!: string;
    link!: string;
    typ?: BeitragTyp;
    titel!: string;
    datum!: Date;
    beschreibung?: string;
    autor!: Person;
    gefaellt?: Person[];
    gefaellt_nicht?: Person[];
    gefaellt_num!: number;
    gefaellt_nicht_num!: number;
    angesehen_num!: number;
    angesehen!: Person[];
    empfaenger?: Person[];
    ablaufDatum?: Date;
}

export enum BeitragTyp {
    FOTO = "FOTO",
    VIDEO = "VIDEO"
}