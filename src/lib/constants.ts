import { Goal, Trophy, Dumbbell, Car, Gamepad2, LayoutGrid, type LucideIcon } from 'lucide-react';

export interface SportOption { id: string; name: string; icon: LucideIcon; color: string; }

export const SPORTS: SportOption[] = [
  { id: 'all', name: 'Todos', icon: LayoutGrid, color: '#A0A0A0' },
  { id: 'futebol', name: 'Futebol', icon: Goal, color: '#00C853' },
  { id: 'basquete', name: 'Basquete', icon: Trophy, color: '#FF6B35' },
  { id: 'tenis', name: 'Tênis', icon: Trophy, color: '#FFD700' },
  { id: 'volei', name: 'Vôlei', icon: Trophy, color: '#FFA500' },
  { id: 'ufc', name: 'UFC / MMA', icon: Dumbbell, color: '#FF1744' },
  { id: 'f1', name: 'Fórmula 1', icon: Car, color: '#E10600' },
  { id: 'basebol', name: 'Basebol', icon: Trophy, color: '#3B82F6' },
  { id: 'hoquei', name: 'Hóquei', icon: Trophy, color: '#06B6D4' },
  { id: 'esports', name: 'eSports', icon: Gamepad2, color: '#8B5CF6' },
];

export const BET_TYPES = [
  'Resultado Final',
  'Mais/Menos Gols (Over/Under)',
  'Ambas Marcam',
  'Handicap',
  'Placar Exato',
  'Primeiro a Marcar',
  'Marca a Qualquer Momento',
  'Cartões',
  'Escanteios',
  'Handicap Asiático',
  'Dupla Chance',
  'Empate Anula Aposta',
];

export const NEWS_CATEGORIES = [
  'Mercado da Bola',
  'Transferências',
  'Lesões',
  'Escalações',
  'Geral',
];

export interface BookmakerOption {
  id: string;
  name: string;
  color: string;
}

export const BOOKMAKERS: BookmakerOption[] = [
  { id: 'bet365', name: 'Bet365', color: '#007B5F' },
  { id: 'betano', name: 'Betano', color: '#FF6600' },
  { id: 'superbet', name: 'Superbet', color: '#00A651' },
  { id: 'sportingbet', name: 'Sportingbet', color: '#E41B13' },
  { id: 'kto', name: 'KTO', color: '#FF6B00' },
  { id: 'blaze', name: 'Blaze', color: '#FF3333' },
  { id: 'estrelabet', name: 'EstrelaBet', color: '#FFD700' },
];

export interface CountryOption { flag: string; name: string; }
export const COUNTRIES: CountryOption[] = [
  { flag: '🇧🇷', name: 'Brasil' },{ flag: '🇦🇷', name: 'Argentina' },{ flag: '🇩🇪', name: 'Alemanha' },
  { flag: '🇪🇸', name: 'Espanha' },{ flag: '🇫🇷', name: 'França' },{ flag: '🇵🇹', name: 'Portugal' },
  { flag: '🇮🇹', name: 'Itália' },{ flag: '🇳🇱', name: 'Holanda' },{ flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Inglaterra' },
  { flag: '🇺🇸', name: 'Estados Unidos' },{ flag: '🇲🇽', name: 'México' },{ flag: '🇨🇦', name: 'Canadá' },
  { flag: '🇺🇾', name: 'Uruguai' },{ flag: '🇨🇴', name: 'Colômbia' },{ flag: '🇧🇪', name: 'Bélgica' },
  { flag: '🇭🇷', name: 'Croácia' },{ flag: '🇲🇦', name: 'Marrocos' },{ flag: '🇯🇵', name: 'Japão' },
  { flag: '🇰🇷', name: 'Coreia do Sul' },{ flag: '🇦🇺', name: 'Austrália' },{ flag: '🇨🇭', name: 'Suíça' },
  { flag: '🇩🇰', name: 'Dinamarca' },{ flag: '🇸🇪', name: 'Suécia' },{ flag: '🇳🇴', name: 'Noruega' },
  { flag: '🇵🇱', name: 'Polônia' },{ flag: '🇷🇸', name: 'Sérvia' },{ flag: '🇺🇦', name: 'Ucrânia' },
  { flag: '🇹🇷', name: 'Turquia' },{ flag: '🇷🇺', name: 'Rússia' },{ flag: '🇨🇳', name: 'China' },
  { flag: '🇮🇳', name: 'Índia' },{ flag: '🇪🇬', name: 'Egito' },{ flag: '🇳🇬', name: 'Nigéria' },
  { flag: '🇬🇭', name: 'Gana' },{ flag: '🇨🇲', name: 'Camarões' },{ flag: '🇨🇱', name: 'Chile' },
  { flag: '🇪🇨', name: 'Equador' },{ flag: '🇵🇾', name: 'Paraguai' },{ flag: '🇵🇪', name: 'Peru' },
  { flag: '🇧🇴', name: 'Bolívia' },{ flag: '🇻🇪', name: 'Venezuela' },{ flag: '🇨🇷', name: 'Costa Rica' },
  { flag: '🇭🇳', name: 'Honduras' },{ flag: '🇬🇹', name: 'Guatemala' },{ flag: '🇯🇲', name: 'Jamaica' },
  { flag: '🇶🇦', name: 'Catar' },{ flag: '🇸🇦', name: 'Arábia Saudita' },{ flag: '🇮🇷', name: 'Irã' },
  { flag: '🇮🇶', name: 'Iraque' },{ flag: '🇦🇪', name: 'Emirados Árabes' },{ flag: '🇮🇱', name: 'Israel' },
  { flag: '🇬🇷', name: 'Grécia' },{ flag: '🇨🇿', name: 'República Tcheca' },{ flag: '🇦🇹', name: 'Áustria' },
  { flag: '🇭🇺', name: 'Hungria' },{ flag: '🇫🇮', name: 'Finlândia' },{ flag: '🇮🇪', name: 'Irlanda' },
  { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Escócia' },{ flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', name: 'País de Gales' },{ flag: '🇬🇪', name: 'Geórgia' },
  { flag: '🇷🇴', name: 'Romênia' },{ flag: '🇧🇬', name: 'Bulgária' },{ flag: '🇸🇮', name: 'Eslovênia' },
  { flag: '🇸🇰', name: 'Eslováquia' },{ flag: '🇧🇦', name: 'Bósnia' },{ flag: '🇲🇰', name: 'Macedônia do Norte' },
  { flag: '🇿🇦', name: 'África do Sul' },{ flag: '🇰🇪', name: 'Quênia' },{ flag: '🇦🇴', name: 'Angola' },
  { flag: '🇲🇿', name: 'Moçambique' },{ flag: '🇨🇻', name: 'Cabo Verde' },{ flag: '🇩🇿', name: 'Argélia' },
  { flag: '🇹🇳', name: 'Tunísia' },{ flag: '🇸🇳', name: 'Senegal' },{ flag: '🇨🇮', name: 'Costa do Marfim' },
  { flag: '🇹🇭', name: 'Tailândia' },{ flag: '🇻🇳', name: 'Vietnã' },{ flag: '🇲🇾', name: 'Malásia' },
  { flag: '🇮🇩', name: 'Indonésia' },{ flag: '🇵🇭', name: 'Filipinas' },{ flag: '🇸🇬', name: 'Cingapura' },
  { flag: '🇳🇿', name: 'Nova Zelândia' },{ flag: '🇵🇦', name: 'Panamá' },{ flag: '🇩🇴', name: 'República Dominicana' },
  { flag: '🇨🇺', name: 'Cuba' },{ flag: '🇵🇷', name: 'Porto Rico' },{ flag: '🇹🇹', name: 'Trinidad e Tobago' },
];

export const CHAMPIONSHIPS: Record<string, string[]> = {
  futebol: ['Copa do Mundo 2026', 'Brasileirão Série A', 'Brasileirão Série B', 'Libertadores', 'Sul-Americana', 'Champions League', 'Premier League', 'La Liga', 'Serie A (ITA)', 'Bundesliga', 'Ligue 1', 'Copa do Brasil', 'Eliminatórias Sul-Americanas'],
  basquete: ['NBA', 'EuroLeague', 'NBB'],
  tenis: ['ATP Tour', 'WTA Tour', 'Grand Slam'],
  volei: ['Superliga', 'VNL', 'Champions League Vôlei'],
  ufc: ['UFC', 'Bellator', 'ONE Championship'],
  f1: ['Fórmula 1 2026'],
  basebol: ['MLB', 'NPB'],
  hoquei: ['NHL', 'KHL'],
  esports: ['CS2', 'LoL', 'Valorant', 'Dota 2'],
};