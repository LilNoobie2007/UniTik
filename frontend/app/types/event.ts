export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  ticket_price: string | number;
  category_tags: string | null;
  status: string;
  page_views: number;
  venue_name: string | null;
  location_details: string | null;
  max_capacity: number | null;
  organizer_name: string | null;
  committee_name: string | null;
  date: string;
  price: string;
  location: string;
  category: string;
}

export interface EventsListSuccess {
  status: "success";
  data: CampusEvent[];
}

export interface EventsListError {
  status: "error";
  message: string;
}

export type EventsListResponse = EventsListSuccess | EventsListError;

export interface EventCardProps {
  event: CampusEvent;
  index: number;
}

export interface EventFeedProps {
  apiUrl?: string;
}

export interface SkeletonCardProps {
  className?: string;
}
