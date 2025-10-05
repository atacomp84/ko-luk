import { BookOpen, Book, Calculator, FlaskConical, History, MessageSquare, Globe, Palette } from 'lucide-react';
import React from 'react';

export const getSubjectIconComponent = (subject: string): React.ElementType => {
    switch (subject) {
        case "Kitap Okuma": return BookOpen;
        case "Türkçe": return Book;
        case "Matematik": return Calculator;
        case "Fen Bilimleri": return FlaskConical;
        case "T.C. İnkılap Tarihi ve Atatürkçülük": return History;
        case "Din Kültürü ve Ahlak Bilgisi": return MessageSquare;
        case "İngilizce": return Globe;
        default: return Palette;
    }
};

export const getSubjectColorClass = (subject: string): string => {
    switch (subject) {
        case "Kitap Okuma": return "text-orange-500";
        case "Türkçe": return "text-blue-500";
        case "Matematik": return "text-green-500";
        case "Fen Bilimleri": return "text-purple-500";
        case "T.C. İnkılap Tarihi ve Atatürkçülük": return "text-red-500";
        case "Din Kültürü ve Ahlak Bilgisi": return "text-yellow-500";
        case "İngilizce": return "text-indigo-500";
        default: return "text-gray-500";
    }
};

export const topicColors = [
  "text-sky-500", "text-emerald-500", "text-violet-500", "text-fuchsia-500",
  "text-cyan-500", "text-rose-500", "text-indigo-500", "text-teal-500",
];

export const getTopicColorClass = (index: number): string => {
  if (index < 0) return "text-foreground";
  return topicColors[index % topicColors.length];
};