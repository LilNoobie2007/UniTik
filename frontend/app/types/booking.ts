import type { CampusEvent } from "./event";

export interface BookingModalProps {
  event: CampusEvent;
  isOpen: boolean;
  onClose: () => void;
}

export interface BookingRequestBody {
  user_id: string;
  event_id: string;
}

export interface BookingSuccessResponse {
  status: "success";
  ticket_hash: string;
  email_sent: boolean;
}

export interface BookingErrorResponse {
  status: "error";
  message: string;
}

export type BookingResponse = BookingSuccessResponse | BookingErrorResponse;
