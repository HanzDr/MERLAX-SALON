// tiny helper
import { FaStar, FaRegStar } from "react-icons/fa";

export const StarRating = ({
  rating = 0,
  outOf = 5,
}: {
  rating?: number;
  outOf?: number;
}) => (
  <div
    className="flex items-center gap-1 text-amber-400"
    aria-label={`Rating: ${rating} of ${outOf}`}
  >
    {Array.from({ length: outOf }).map((_, i) =>
      i < rating ? (
        <FaStar key={i} className="h-5 w-5" />
      ) : (
        <FaRegStar key={i} className="h-5 w-5" />
      )
    )}
  </div>
);
