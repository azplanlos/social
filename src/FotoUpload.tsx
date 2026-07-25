import React, { useEffect } from "react";
import { useState } from "react";

export type FotoUploadProps = {
    waehlen: boolean;
    onSelected: (f: File) => void;
}

function FotoUpload(props: FotoUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
        setFile(e.target.files[0]);
        props.onSelected(e.target.files[0]);
        }
    };

    useEffect(() => {
        if (props.waehlen) {
            inputRef?.current?.click();
        }
    }, [props.waehlen]);
    
    return (
        <input id="file" type="file" onChange={handleFileChange} accept="image/*" ref={inputRef} />
    )
}

export default FotoUpload;