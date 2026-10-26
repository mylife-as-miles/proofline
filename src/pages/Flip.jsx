import { useParams } from "react-router-dom";
import { FlipBook } from "@/components/flip/FlipBook";
import { sampleById } from "@/lib/samples";
import "@/styles/flip.css";

export default function Flip() {
  const { id } = useParams();
  return <FlipBook id={id} initial={sampleById(id)} />;
}
