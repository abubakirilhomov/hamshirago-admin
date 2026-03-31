import { useState } from "react";
import { getMedicReviews, type Review } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Star, Search, MessageSquare } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-foreground">{rating}</span>
    </span>
  );
}

export default function Reviews() {
  const [medicId, setMedicId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const id = medicId.trim();
    if (!id) {
      toast.error("Введите ID медика");
      return;
    }
    setLoading(true);
    setSearched(false);
    try {
      const data = await getMedicReviews(id);
      setReviews(data);
      setSearched(true);
    } catch {
      toast.error("Ошибка загрузки отзывов");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Отзывы</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Просмотр отзывов о медике по его ID
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3 max-w-lg">
        <Input
          placeholder="Введите ID медика..."
          value={medicId}
          onChange={(e) => setMedicId(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-mono"
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          Найти
        </Button>
      </div>

      {/* Stats */}
      {searched && !loading && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Найдено отзывов:{" "}
            <span className="font-semibold text-foreground">{reviews.length}</span>
          </span>
          {avgRating && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              Средний рейтинг:
              <span className="ml-1 font-semibold text-foreground flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {avgRating}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Рейтинг</TableHead>
              <TableHead>Комментарий</TableHead>
              <TableHead>Роль автора</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !searched ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-16 text-muted-foreground"
                >
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Введите ID медика и нажмите «Найти»
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-16 text-muted-foreground"
                >
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Отзывов не найдено
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell>
                    <StarRating rating={r.rating} />
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <p className="text-sm text-foreground">
                      {r.comment || (
                        <span className="text-muted-foreground italic">
                          Без комментария
                        </span>
                      )}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.authorRole === "client"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300"
                          : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300"
                      }
                    >
                      {r.authorRole === "client" ? "Клиент" : "Медик"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
