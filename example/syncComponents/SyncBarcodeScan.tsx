// import * as React from "react";
// import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
// import { makeSyncUI } from "../../dist";
// import BarcodeScannerComponent from "react-qr-barcode-scanner";

// export const syncBarcodeScan = makeSyncUI<
//   {
//     title: string;
//     maxTries?: number;
//     canUserReject?: boolean;
//   },
//   string
// >(props => {
//   const [input, setInput] = React.useState("");

//   return (
//     <Modal isOpen={true} toggle={props.data.canUserReject ? () => props.reject(new Error("scanner-ended")) : undefined}>
//       <ModalHeader>{props.data.title}</ModalHeader>

//       <ModalBody>
//         <input autoFocus value={input} onChange={e => setInput(e.target.value)} />
//         <Button onClick={() => props.resolve(input)}>use text</Button>

//         <BarcodeScannerComponent
//           width={500}
//           height={500}
//           onUpdate={(error, result) => {
//             if (error) return;

//             const qrText = result?.getText() ?? "";

//             if (result) props.resolve(qrText);
//           }}
//         />
//       </ModalBody>

//       {props.data.canUserReject && (
//         <ModalFooter>
//           <Button onClick={() => props.reject(new Error("scanner-ended"))}>Close</Button>
//         </ModalFooter>
//       )}
//     </Modal>
//   );
// });

export const a = {};
