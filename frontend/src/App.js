import { Button, IconButton, TextField } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PhoneIcon from "@mui/icons-material/Phone";
import React, { useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Popover from "@mui/material/Popover";
import "./App.css";
import { Box } from "@mui/system";
import InputAdornment from "@mui/material/InputAdornment";
import capitalize from "@mui/utils/capitalize";

const socket = io.connect(process.env.REACT_APP_BASE_URL);
function App() {
  const [audio] = useState(
    new Audio(
      "https://res.cloudinary.com/silva/video/upload/v1657950887/mixkit-alert-bells-echo-765.wav"
    )
  );

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    if (receivingCall && !callAccepted) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.start(0);
      osc.stop(1);
      audio.play();
      audio.loop = true;
    } else {
      audio.pause();
    }
  }, [receivingCall, callAccepted, audio]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
        myVideo.current.autoplay = true;
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <div className="main-container">
      {" "}
      <h1 style={{ textAlign: "center", color: "#fff" }}>
        Akomahealth Meet{" "}
        {receivingCall && !callAccepted ? (
          <div className="caller">
            {capitalize(name)} is calling...
            <Button
              size="small"
              onClick={answerCall}
              variant="contained"
              color="success"
            >
              Answer Call
            </Button>
          </div>
        ) : null}
      </h1>
      <div className="container">
        <div
          className={`${
            callAccepted && !callEnded ? "unpinned-video" : "pinned-video"
          }`}
        >
          {stream && (
            <>
              <video playsInline muted ref={myVideo} autoPlay />{" "}
              <small className="video-title">me</small>
            </>
          )}
        </div>

        <div
          className={`${
            callAccepted && !callEnded ? "pinned-video" : "unpinned-video"
          }`}
        >
          {callAccepted && !callEnded ? (
            <>
              <video playsInline ref={userVideo} autoPlay />
              <small className="video-title">{name}</small>
            </>
          ) : null}
        </div>

        <Accordion
          sx={{
            position: "fixed",
            top: "10px",
            left: "10px",
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Meet ID</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div className="myId">
              <TextField
                size="small"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ marginBottom: "10px" }}
              />
              <CopyToClipboard text={me}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!name}
                  startIcon={<AssignmentIcon fontSize="large" />}
                >
                  Copy Call ID
                </Button>
              </CopyToClipboard>
            </div>
          </AccordionDetails>
        </Accordion>

        <div className="action-container">
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <IconButton
                aria-label="call"
                color="error"
                title="leave Call"
                onClick={leaveCall}
              >
                <PhoneIcon fontSize="large" />
              </IconButton>
            ) : (
              <>
                <IconButton
                  color="primary"
                  aria-label="call"
                  title="Call"
                  aria-describedby={id}
                  variant="contained"
                  onClick={handleClick}
                >
                  <PhoneIcon fontSize="large" />
                </IconButton>

                <Popover
                  id={id}
                  open={open}
                  anchorEl={anchorEl}
                  onClose={handleClose}
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "center",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                  }}
                  anchorPosition={{
                    top: 500,
                  }}
                >
                  <Box p={3} sx={{ display: "flex", flexDirection: "column" }}>
                    <TextField
                      label="Name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      sx={{ mb: "10px" }}
                      size="small"
                    />
                    <TextField
                      label="ID to call"
                      value={idToCall}
                      size="small"
                      placeholder="zzbiuycuygeho73iy"
                      onChange={(e) => setIdToCall(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Button
                              disabled={!idToCall || !name}
                              variant="contained"
                              color="success"
                              onClick={() => {
                                callUser(idToCall);
                              }}
                              size="small"
                            >
                              call
                            </Button>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Popover>
              </>
            )}
            {idToCall}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
