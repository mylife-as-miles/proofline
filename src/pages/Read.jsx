import { useParams } from "react-router-dom";
import { Reader } from "@/components/reader/Reader";
import { sampleById } from "@/lib/samples";

export default function ReadPage() {
  const { id } = useParams();
  return <Reader key={id} id={id} initial={sampleById(id)} />;
}
