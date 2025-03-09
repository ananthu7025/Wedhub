import { toast } from "react-toastify";

import Error from "@/assets/images/error-toast.svg"
import submitedForm from "@/assets/images/submitedForm.svg"
import Image from "next/image";

const toaster = {
  error: (message: string) =>
    toast.error(message, {
      theme: "colored",
      style: {
        background: "#FF4D4F",
        minHeight: 0,
        fontSize: "0.875rem",
      },
      icon() {
        return <div><Image src={Error} alt="icon"/></div>
      },
    }),
  success: (message: string) =>
    toast.success(message, {
      theme: "colored",
      style: {
        background: "#02B04E",
        minHeight: 0,
        fontSize: "0.875rem",
      },
      icon() {
        return <div><Image src={submitedForm} alt="icon"/></div>
      },
    }),
};

export default toaster;
