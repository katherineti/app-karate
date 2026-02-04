export type Athlete = {
    id: number;
    nombres: string;
    apellidos: string;
    edad: number;
    escuela: string;
    cinturon: string;
    ranking: number;
    cedula: string;
    oro: number;
    plata: number;
    bronce: number;
    logoUrl?: string;
    registrationDate: Date;
    dateOfBirth?: string; // ISO 8601 date string
    rankingBreakdown?: {
      eventId: string;
      eventName: string;
      date: string; // ISO 8601 date string
      points: number;
      category: string;
      modality: string;
      medal: 'Oro' | 'Plata' | 'Bronce' | 'N/A';
      finalScore: number;
    }[];
  };
  
  export type School = {
    value: number;
    label: string;
    logoUrl?: string;
    maxScore: number;
  };
  
  export interface EventCategory {
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
    belts: string[];
    enabled: boolean;
    progressionSystem: 'simple' | 'sum' | 'wkf';
    kataCount?: number;
    combateCount?: number;
  }
  
  export type KarateEvent = {
      id: string;
      name: string;
      description: string;
      date: Date;
      location: string;
      type: 'competencia' | 'seminario' | 'exhibicion' | 'examen-de-grado';
      type_id?: number;
      subtype: string;
      subtype_id?: number;
      suma_ranking: boolean;
      status: 'programado' | 'en-curso' | 'finalizado' | 'cancelado';
      status_id?: number;
      categories?: EventCategory[];
      divisions?: Record<string, { enabled: boolean; judges: { id: string; name: string | null; lastname: string | null; email: string; is_active: boolean; }[] }>;
      activeRounds?: Record<string, string>; // e.g. { 'division-id': 'Ronda 2' }
      maxScore?: number;
      maxParticipants?: number;
      isActive: boolean;
  };
  
  export const schools: School[] = [
    { value: 1, label: 'Antonio Díaz Dojo', logoUrl: 'https://storage.googleapis.com/proudcity/antoniokenpo/uploads/2020/07/antonio-diaz-logo.png', maxScore: 10 },
    { value: 2, label: 'Shito-Ryu Karate', logoUrl: 'https://www.shitokai.com/images/logo_ishimi_shitoryu_karatedo.jpg', maxScore: 20 },
    { value: 3, label: 'Dojo Okinawa', logoUrl: 'https://dojookinawa.com/wp-content/uploads/2020/03/logo-okinawa-min.png', maxScore: 50 },
    { value: 4, label: 'Bushido Vzla', logoUrl: 'https://bushidovzla.files.wordpress.com/2016/09/cropped-bushido-vzla-logo-300.png', maxScore: 100 },
    { value: 5, label: 'Shotokan Caracas', logoUrl: 'https://www.oskivenezuela.com/wp-content/uploads/2016/02/logo_oskil.png', maxScore: 100 },
    { value: 6, label: 'Gensei-Ryu Miranda', logoUrl: 'https://www.genseiryu.com.ve/images/logo.png', maxScore: 10 },
    { value: 7, label: 'Wado-Ryu Valencia', maxScore: 10 },
    { value: 8, label: 'Kyokushin Maracay', logoUrl: 'https://www.ikakvenezuela.com/images/logo-iko-kyokushinkaikan-venezuela.png', maxScore: 15 },
    { value: 9, label: 'Shorin-Ryu Barquisimeto', logoUrl: 'https://www.kobayashikaratedo.com/images/logos/logo-kobayashi-ryu-kyudokan-de-venezuela.png', maxScore: 10 },
    { value: 10, label: 'Goju-Ryu Mérida', logoUrl: 'https://gojuryu.org.ve/wp-content/uploads/2021/08/LOGO-OGKK-DE-VENEZUELA-version-final-transparente-296x300.png', maxScore: 10 },
    { value: 11, label: 'Isshin-Ryu San Cristóbal', logoUrl: 'https://i.pinimg.com/736x/8f/9a/c6/8f9ac653856b68260b94427500d4586d.jpg', maxScore: 10 },
    { value: 12, label: 'Kenpo Karate Zulia', logoUrl: 'https://static.wixstatic.com/media/2513f5_0710b656336a4329b350711939cb4594~mv2.png/v1/fill/w_260,h_260,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/Original.png', maxScore: 12 },
    { value: 13, label: 'Ryuei-Ryu Anzoátegui', logoUrl: 'https://www.ryueiryu.com/en/common/images/h_logo.gif', maxScore: 10 },
    { value: 14, label: 'Shudokan Bolívar', logoUrl: 'https://shudokan.com.ve/wp-content/uploads/2020/09/logo-shudokan-3.png', maxScore: 10 },
    { value: 15, label: 'Yoshukai Sucre', logoUrl: 'https://yoshukai.org/wp-content/uploads/2019/11/YK-Logo-Web-Transparent.png', maxScore: 10 },
  ];
  
  const firstNames = ['Pedro', 'Ana', 'Carlos', 'Valentina', 'Luis', 'Mariana', 'Diego', 'Camila', 'Andrés', 'Sofía', 'Juan', 'Gabriela', 'Elena', 'Lucía', 'Mateo', 'Isabella', 'Javier', 'Valeria', 'Ricardo', 'Paula', 'Miguel', 'Daniela', 'Alejandro'];
  const lastNames = ['Salas', 'González', 'Hernández', 'Romero', 'Martínez', 'Pinto', 'Suárez', 'López', 'García', 'Méndez', 'Ramírez', 'Rojas', 'Moreno', 'Castillo', 'Peña', 'Acosta', 'Gil', 'Soto', 'Rivas', 'Alvarez', 'Torres', 'Mendoza'];
  const belts = ["Blanco", "Amarillo", "Naranja", "Verde", "Azul", "Púrpura", "Marrón", "Negro"];
  
  const generateUniqueAthletes = (): Athlete[] => {
      const athletesSet = new Set<string>();
      const allAthletes: Athlete[] = [];
      const years = [2025, 2024, 2023, 2022];
      let idCounter = 1;
  
      years.forEach(year => {
          const count = year === 2025 ? 50 : 25;
          for (let i = 0; i < count; i++) {
              const firstNameIndex = Math.floor(Math.random() * firstNames.length);
              const lastNameIndex = Math.floor(Math.random() * lastNames.length);
              const firstName = firstNames[firstNameIndex];
              const lastName = lastNames[lastNameIndex];
              const fullName = `${firstName} ${lastName}`;
              
              if (!athletesSet.has(fullName)) {
                  athletesSet.add(fullName);
                  const school = schools[idCounter % schools.length];
                  
                  const oro = Math.max(0, Math.floor(Math.random() * 5));
                  const plata = Math.max(0, Math.floor(Math.random() * 8));
                  const bronce = Math.max(0, Math.floor(Math.random() * 10));

                  const age = 10 + (idCounter % 15);
                  const birthYear = new Date().getFullYear() - age;
                  const birthDate = new Date(birthYear, idCounter % 12, (idCounter % 28) + 1);
                  
                  const ranking = 100 + (idCounter % 10 * 2) + Math.floor(Math.random() * 100);
                  
                  const points1 = Math.round(ranking * 0.4);
                  const points2 = Math.round(ranking * 0.35);
                  const points3 = ranking - points1 - points2;
                  
                  const rankingBreakdown: Athlete['rankingBreakdown'] = [
                      {
                          eventId: 'evt-004',
                          eventName: 'Copa Internacional Simón Bolívar',
                          date: new Date(new Date().getFullYear() - 1, 10, 10).toISOString(),
                          points: points1,
                          category: 'Juvenil',
                          modality: 'Forma Tradicional',
                          medal: 'Oro',
                          finalScore: 28.5,
                      },
                      {
                          eventId: 'evt-009',
                          eventName: 'Campeonato Estadal de Karate',
                          date: new Date(new Date().getFullYear(), 4, 15).toISOString(),
                          points: points2,
                          category: 'Juvenil',
                          modality: 'Kumite',
                          medal: 'Plata',
                          finalScore: 12,
                      },
                       {
                          eventId: 'evt-007',
                          eventName: 'Torneo Regional de Los Andes',
                          date: new Date(new Date().getFullYear(), 9, 26).toISOString(),
                          points: points3,
                          category: 'Juvenil',
                          modality: 'Forma con Armas',
                          medal: 'Oro',
                          finalScore: 27.9,
                      }
                  ];
  
                  allAthletes.push({
                      id: (year * 100) + idCounter,
                      nombres: firstName,
                      apellidos: lastName,
                      edad: age,
                      escuela: school.label,
                      cinturon: belts[idCounter % belts.length],
                      ranking: ranking,
                      cedula: `V-28${100000 + idCounter}`,
                      oro: oro,
                      plata: plata,
                      bronce: bronce,
                      logoUrl: school.logoUrl,
                      registrationDate: new Date(`${year}-${String((idCounter % 12) + 1).padStart(2, '0')}-${String((idCounter % 28) + 1).padStart(2, '0')}T10:00:00Z`),
                      dateOfBirth: birthDate.toISOString(),
                      rankingBreakdown,
                  });
                  idCounter++;
              }
          }
      });
  
      const requiredAthletes = [
        { nombres: 'Lucía', apellidos: 'Moreno' },
        { nombres: 'Ricardo', apellidos: 'Soto' }
      ];
  
      requiredAthletes.forEach(reqAthlete => {
        if (!athletesSet.has(`${reqAthlete.nombres} ${reqAthlete.apellidos}`)) {
           allAthletes.push({
              id: 202500 + idCounter,
              nombres: reqAthlete.nombres,
              apellidos: reqAthlete.apellidos,
              edad: 22,
              escuela: 'Antonio Díaz Dojo',
              cinturon: 'Negro',
              ranking: 150,
              cedula: `V-28${100000 + idCounter}`,
              oro: 5,
              plata: 2,
              bronce: 1,
              registrationDate: new Date('2025-01-15T10:00:00Z'),
              dateOfBirth: new Date(new Date().getFullYear() - 22, 5, 15).toISOString(),
            });
            idCounter++;
        }
      });
  
      return allAthletes;
  }
  
  export let athletes: Athlete[] = generateUniqueAthletes();
  
  export const events: KarateEvent[] = [
      {
          id: 'evt-001',
          name: 'Campeonato Nacional Juvenil',
          description: 'El campeonato nacional que reúne a los mejores talentos juveniles del país.',
          date: new Date(new Date().getFullYear(), 7, 15),
          location: 'Caracas, Distrito Capital',
          type: 'competencia',
          subtype: 'Oficial Federada (Nacional/Estadal)',
          status: 'programado',
          maxScore: 10,
          isActive: true,
          categories: [],
          divisions: {},
          suma_ranking: true,
      },
      {
          id: 'evt-002',
          name: 'Seminario con Antonio Díaz',
          description: 'Oportunidad única para aprender del múltiple campeón mundial de kata.',
          date: new Date(new Date().getFullYear(), 8, 5),
          location: 'Valencia, Carabobo',
          type: 'seminario',
          subtype: 'Maestría (Gasshuku)',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      },
      {
          id: 'evt-003',
          name: 'Torneo "Copa Bushido"',
          description: 'Competencia abierta para todas las categorías en la modalidad de kumite.',
          date: new Date(new Date().getFullYear(), 6, 20),
          location: 'Maracay, Aragua',
          type: 'competencia',
          subtype: 'Copa o Invitacional (Amistosa)',
          status: 'en-curso',
          maxScore: 20,
          isActive: true,
          categories: [],
          divisions: {},
          suma_ranking: false,
      },
      {
          id: 'evt-004',
          name: 'Copa Internacional Simón Bolívar',
          description: 'Prestigioso torneo con participación de atletas de toda Latinoamérica.',
          date: new Date(new Date().getFullYear() - 1, 10, 10),
          location: 'Caracas, Distrito Capital',
          type: 'competencia',
          subtype: 'Oficial Federada (Nacional/Estadal)',
          status: 'finalizado',
          maxScore: 50,
          isActive: false,
          categories: [
              { id: 'cat-senior', name: 'Senior', minAge: 18, maxAge: 99, belts: ['Marrón', 'Negro'], enabled: true, progressionSystem: 'wkf' },
              { id: 'cat-cadete', name: 'Cadete', minAge: 14, maxAge: 15, belts: ['Verde', 'Azul', 'Púrpura'], enabled: true, progressionSystem: 'simple' }
          ],
          divisions: {
              'cat-senior-forma-tradicional': { enabled: true, judges: [{ id: '202525', name: 'Juez A', lastname: 'Test', email: 'juez@a.com', is_active: true }] },
              'cat-cadete-combate-point': { enabled: true, judges: [{ id: '202530', name: 'Juez B', lastname: 'Test', email: 'juez@b.com', is_active: true }] }
          },
          activeRounds: {
            'cat-senior-forma-tradicional': 'Ronda 2',
          },
          suma_ranking: true,
      },
      {
          id: 'evt-005',
          name: 'Exhibición de Artes Marciales',
          description: 'Muestra de las diferentes disciplinas de artes marciales practicadas en el país.',
          date: new Date(new Date().getFullYear(), 5, 1),
          location: 'Barquisimeto, Lara',
          type: 'exhibicion',
          subtype: 'Promocional',
          status: 'finalizado',
          isActive: false,
          suma_ranking: false,
      },
      {
          id: 'evt-006',
          name: 'Campamento de Verano',
          description: 'Campamento intensivo de entrenamiento para atletas de alto rendimiento.',
          date: new Date(new Date().getFullYear(), 7, 1),
          location: 'Mérida, Mérida',
          type: 'seminario',
          subtype: 'Técnico (Kata/Kumite)',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      },
       {
          id: 'evt-007',
          name: 'Torneo Regional de Los Andes',
          description: 'Competencia para los dojos de la región andina.',
          date: new Date(new Date().getFullYear(), 9, 26),
          location: 'San Cristóbal, Táchira',
          type: 'competencia',
          subtype: 'Oficial Federada (Nacional/Estadal)',
          status: 'programado',
          isActive: true,
          categories: [],
          divisions: {},
          suma_ranking: true,
      },
      {
          id: 'evt-008',
          name: 'Examen de Grado Dan',
          description: 'Examen de grado para aspirantes a cinturón negro y danes superiores.',
          date: new Date(new Date().getFullYear(), 11, 7),
          location: 'Caracas, Distrito Capital',
          type: 'examen-de-grado',
          subtype: 'Paso de Dan (Cinturón Negro)',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      },
       {
          id: 'evt-009',
          name: 'Campeonato Estadal de Karate',
          description: 'El campeonato que reúne a los mejores talentos del estado.',
          date: new Date(new Date().getFullYear(), 4, 15),
          location: 'Caracas, Distrito Capital',
          type: 'competencia',
          subtype: 'Oficial Federada (Nacional/Estadal)',
          status: 'finalizado',
          maxScore: 100,
          isActive: false,
          suma_ranking: true,
      },
      {
          id: 'evt-010',
          name: 'Campeonato Nacional Infantil',
          description: 'El campeonato que reúne a los mejores talentos infantiles del país.',
          date: new Date(new Date().getFullYear(), 2, 15),
          location: 'Caracas, Distrito Capital',
          type: 'competencia',
          subtype: 'Oficial Federada (Nacional/Estadal)',
          status: 'cancelado',
          isActive: true,
          categories: [],
          divisions: {},
          suma_ranking: true,
      },
      {
          id: 'evt-011',
          name: 'Curso de Arbitraje',
          description: 'Curso de formación y actualización para árbitros de karate.',
          date: new Date(new Date().getFullYear(), 6, 10),
          location: 'Online',
          type: 'seminario',
          subtype: 'Arbitraje',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      },
      {
          id: 'evt-012',
          name: 'Gasshuku Nacional de Verano',
          description: 'Encuentro nacional para entrenamiento conjunto y convivencia.',
          date: new Date(new Date().getFullYear(), 7, 25),
          location: 'Higuerote, Miranda',
          type: 'seminario',
          subtype: 'Maestría (Gasshuku)',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      },
      {
          id: 'evt-013',
          name: 'Competencia de Kata y Kumite',
          description: 'Competencia interna del Dojo Okinawa.',
          date: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
          location: 'Dojo Okinawa',
          type: 'competencia',
          subtype: 'Copa o Invitacional (Amistosa)',
          status: 'programado', // <-- CORRECCIÓN: Campo 'status' añadido
          divisions: {
              'infantil-forma-tradicional': {
                  enabled: true,
                  judges: [{ id: '202525', name: 'Juez C', lastname: 'Test', email: 'juez@c.com', is_active: true }]
              },
              'juvenil-combate-point': {
                  enabled: true,
                  judges: [{ id: '202530', name: 'Juez D', lastname: 'Test', email: 'juez@d.com', is_active: true }]
              }
          },
          maxScore: 50,
          isActive: true,
          categories: [],
          suma_ranking: false,
      },
      {
          id: 'evt-014',
          name: 'Exhibición Aniversario',
          description: 'Celebración del aniversario de Shito-Ryu Karate.',
          date: new Date(new Date().getFullYear(), new Date().getMonth(), 22),
          location: 'Shito-Ryu Karate',
          type: 'exhibicion',
          subtype: 'Gala Marcial',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      },
      {
          id: 'evt-015',
          name: 'Seminario de Defensa Personal',
          description: 'Taller práctico de técnicas de defensa personal.',
          date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5),
          location: 'Gimnasio Municipal',
          type: 'seminario',
          subtype: 'Técnico (Kata/Kumite)',
          status: 'programado',
          isActive: true,
          suma_ranking: false,
      }
  ];
  
  export const officialResults = {
      athletes: [
          { id: '202501', firstName: 'Pedro', lastName: 'Salas', school: 'Antonio Díaz Dojo', ranking: 1490 },
          { id: '202502', firstName: 'Ana', lastName: 'González', school: 'Shito-Ryu Karate', ranking: 1485 },
          { id: '202503', firstName: 'Carlos', lastName: 'Hernández', school: 'Dojo Okinawa', ranking: 1480 },
          { id: '202504', firstName: 'Valentina', lastName: 'Romero', school: 'Bushido Vzla', ranking: 1475 },
      ],
      results: {
          'evt-004-cadete-forma': {
              eventId: 'evt-004',
              divisionId: 'cadete-forma',
              category: 'Cadete',
              modality: 'Forma Tradicional',
              standings: [
                  { athleteId: '202501', athleteName: 'Pedro Salas', schoolName: 'Antonio Díaz Dojo', final_score: 27.5, final_score_breakdown: { scores: [{judgeId: 1, control: 9.2, presence: 9.1, presentation: 9.2, total: 9.2}, {judgeId: 2, control: 9, presence: 9.1, presentation: 9.2, total: 9.1}, {judgeId: 3, control: 9.3, presence: 9, presentation: 9.3, total: 9.3}, {judgeId: 4, control: 9.1, presence: 9.2, presentation: 9.2, total: 9.2}, {judgeId: 5, control: 9, presence: 9, presentation: 9.2, total: 9.2}], discarded: [9.3, 9.1], sum: 27.6 } },
                  { athleteId: '202502', athleteName: 'Ana González', schoolName: 'Shito-Ryu Karate', final_score: 26.8, final_score_breakdown: { scores: [{judgeId: 1, control: 8.8, presence: 8.9, presentation: 9, total: 8.9}, {judgeId: 2, control: 8.9, presence: 9, presentation: 9, total: 9}, {judgeId: 3, control: 9, presence: 8.8, presentation: 8.8, total: 8.9}, {judgeId: 4, control: 8.9, presence: 8.9, presentation: 8.9, total: 8.9}, {judgeId: 5, control: 8.7, presence: 8.8, presentation: 8.9, total: 8.8}], discarded: [9, 8.8], sum: 26.7 } },
                  { athleteId: '202503', athleteName: 'Carlos Hernández', schoolName: 'Dojo Okinawa', final_score: 26.2, final_score_breakdown: { scores: [{judgeId: 1, control: 8.5, presence: 8.8, presentation: 8.7, total: 8.7}, {judgeId: 2, control: 8.6, presence: 8.7, presentation: 8.8, total: 8.7}, {judgeId: 3, control: 8.8, presence: 8.8, presentation: 8.8, total: 8.8}, {judgeId: 4, control: 8.7, presence: 8.7, presentation: 8.7, total: 8.7}, {judgeId: 5, control: 8.6, presence: 8.6, presentation: 8.7, total: 8.6}], discarded: [8.8, 8.6], sum: 26.1 } },
              ]
          },
          'evt-004-infantil-forma': {
              eventId: 'evt-004',
              divisionId: 'infantil-forma',
              category: 'Infantil',
              modality: 'Forma Tradicional',
              standings: [
                  { athleteId: '202510', athleteName: 'Camila Pinto', schoolName: 'Bushido Vzla', final_score: 25.5, final_score_breakdown: { scores: [{judgeId: 1, control: 8.5, presence: 8.5, presentation: 8.5, total: 8.5}, {judgeId: 2, control: 8.5, presence: 8.5, presentation: 8.5, total: 8.5}, {judgeId: 3, control: 8.5, presence: 8.5, presentation: 8.5, total: 8.5}, {judgeId: 4, control: 8.5, presence: 8.5, presentation: 8.5, total: 8.5}, {judgeId: 5, control: 8.5, presence: 8.5, presentation: 8.5, total: 8.5}], discarded: [8.5, 8.5], sum: 25.5 } },
                  { athleteId: '202511', athleteName: 'Andrés Suárez', schoolName: 'Shotokan Caracas', final_score: 24.6, final_score_breakdown: { scores: [{judgeId: 1, control: 8.2, presence: 8.2, presentation: 8.2, total: 8.2}, {judgeId: 2, control: 8.3, presence: 8.3, presentation: 8.3, total: 8.3}, {judgeId: 3, control: 8.1, presence: 8.1, presentation: 8.1, total: 8.1}, {judgeId: 4, control: 8.2, presence: 8.2, presentation: 8.2, total: 8.2}, {judgeId: 5, control: 8.2, presence: 8.2, presentation: 8.2, total: 8.2}], discarded: [8.3, 8.1], sum: 24.6 } },
              ]
          },
          'evt-004-senior-forma': {
              eventId: 'evt-004',
              divisionId: 'senior-forma',
              category: 'Senior',
              modality: 'Forma Tradicional',
              standings: [
                  { athleteId: '202507', athleteName: 'Diego Suárez', schoolName: 'Wado-Ryu Valencia', final_score: 29.0, final_score_breakdown: { scores: [{judgeId: 1, control: 9.5, presence: 9.8, presentation: 9.8, total: 9.7}, {judgeId: 2, control: 9.6, presence: 9.7, presentation: 9.7, total: 9.7}, {judgeId: 3, control: 9.7, presence: 9.6, presentation: 9.6, total: 9.6}, {judgeId: 4, control: 9.6, presence: 9.6, presentation: 9.7, total: 9.6}, {judgeId: 5, control: 9.5, presence: 9.7, presentation: 9.5, total: 9.6}], discarded: [9.7, 9.6], sum: 28.9 } },
                  { athleteId: '202508', athleteName: 'Camila López', schoolName: 'Kyokushin Maracay', final_score: 28.5, final_score_breakdown: { scores: [{judgeId: 1, control: 9.5, presence: 9.5, presentation: 9.5, total: 9.5}, {judgeId: 2, control: 9.5, presence: 9.5, presentation: 9.5, total: 9.5}, {judgeId: 3, control: 9.5, presence: 9.5, presentation: 9.5, total: 9.5}, {judgeId: 4, control: 9.5, presence: 9.5, presentation: 9.5, total: 9.5}, {judgeId: 5, control: 9.5, presence: 9.5, presentation: 9.5, total: 9.5}], discarded: [9.5, 9.5], sum: 28.5 } },
              ]
          },
          'evt-004-senior-armas': {
              eventId: 'evt-004',
              divisionId: 'senior-armas',
              category: 'Senior',
              modality: 'Forma con Armas',
              standings: [
                   { athleteId: '202507', athleteName: 'Diego Suárez', schoolName: 'Wado-Ryu Valencia', final_score: 29.1, final_score_breakdown: { scores: [{judgeId: 1, control: 9.7, presence: 9.7, presentation: 9.7, total: 9.7}, {judgeId: 2, control: 9.7, presence: 9.7, presentation: 9.7, total: 9.7}, {judgeId: 3, control: 9.7, presence: 9.7, presentation: 9.7, total: 9.7}, {judgeId: 4, control: 9.7, presence: 9.7, presentation: 9.7, total: 9.7}, {judgeId: 5, control: 9.7, presence: 9.7, presentation: 9.7, total: 9.7}], discarded: [9.7, 9.7], sum: 29.1 } },
              ]
          },
          'evt-004-senior-extremas': {
              eventId: 'evt-004',
              divisionId: 'senior-extremas',
              category: 'Senior',
              modality: 'Formas Extremas',
              standings: [
                   { athleteId: '202508', athleteName: 'Camila López', schoolName: 'Kyokushin Maracay', final_score: 29.4, final_score_breakdown: { scores: [{judgeId: 1, control: 9.8, presence: 9.8, presentation: 9.8, total: 9.8}, {judgeId: 2, control: 9.8, presence: 9.8, presentation: 9.8, total: 9.8}, {judgeId: 3, control: 9.8, presence: 9.8, presentation: 9.8, total: 9.8}, {judgeId: 4, control: 9.8, presence: 9.8, presentation: 9.8, total: 9.8}, {judgeId: 5, control: 9.8, presence: 9.8, presentation: 9.8, total: 9.8}], discarded: [9.8, 9.8], sum: 29.4 } },
              ]
          },
          'evt-004-senior-kickboxing-musical': {
              eventId: 'evt-004',
              divisionId: 'senior-kickboxing-musical',
              category: 'Senior',
              modality: 'Kickboxing - Musical Forms',
              standings: [
                  { athleteId: '202509', athleteName: 'Javier Rivas', schoolName: 'Shorin-Ryu Barquisimeto', final_score: 29.2, final_score_breakdown: { scores: [{judgeId: 1, control: 9.8, presence: 9.7, presentation: 9.8, total: 9.8}, {judgeId: 2, control: 9.7, presence: 9.8, presentation: 9.8, total: 9.8}, {judgeId: 3, control: 9.7, presence: 9.7, presentation: 9.7, total: 9.7}, {judgeId: 4, control: 9.8, presence: 9.8, presentation: 9.8, total: 9.8}, {judgeId: 5, control: 9.6, presence: 9.7, presentation: 9.8, total: 9.7}], discarded: [9.8, 9.7], sum: 29.3 } },
                  { athleteId: '202511', athleteName: 'Miguel Gil', schoolName: 'Isshin-Ryu San Cristóbal', final_score: 28.3, final_score_breakdown: { scores: [{judgeId: 1, control: 9.5, presence: 9.4, presentation: 9.4, total: 9.4}, {judgeId: 2, control: 9.4, presence: 9.5, presentation: 9.5, total: 9.5}, {judgeId: 3, control: 9.4, presence: 9.4, presentation: 9.4, total: 9.4}, {judgeId: 4, control: 9.5, presence: 9.4, presentation: 9.5, total: 9.5}, {judgeId: 5, control: 9.2, presence: 9.3, presentation: 9.4, total: 9.3}], discarded: [9.5, 9.3], sum: 28.3 } },
              ]
          },
          'evt-009-juvenil-forma': {
              eventId: 'evt-009',
              divisionId: 'juvenil-forma',
              category: 'Juvenil',
              modality: 'Forma Tradicional',
              standings: [
                  { athleteId: '202502', athleteName: 'Ana González', schoolName: 'Shito-Ryu Karate', final_score: 88, final_score_breakdown: { scores: [{judgeId: 1, control: 90, presence: 90, presentation: 90, total: 90}, {judgeId: 2, control: 85, presence: 85, presentation: 85, total: 85}, {judgeId: 3, control: 89, presence: 89, presentation: 89, total: 89}], discarded: [90, 85], sum: 89 } },
                  { athleteId: '202504', athleteName: 'Valentina Romero', schoolName: 'Bushido Vzla', final_score: 85, final_score_breakdown: { scores: [{judgeId: 1, control: 84, presence: 84, presentation: 84, total: 84}, {judgeId: 2, control: 86, presence: 86, presentation: 86, total: 86}, {judgeId: 3, control: 85, presence: 85, presentation: 85, total: 85}], discarded: [86, 84], sum: 85 } },
              ]
          }
      }
  };
  
  export const officialCombatResults = {
      'evt-004-senior-combate': {
        category: 'Senior',
        modality: 'Combate Point Fighting',
        rounds: [
          {
            name: 'Cuartos de Final',
            matches: [
              { id: 'm1', athlete1Id: '202501', athlete2Id: '202502', score1: 8, score2: 5, winnerId: '202501' },
              { id: 'm2', athlete1Id: '202503', athlete2Id: '202504', score1: 6, score2: 9, winnerId: '202504' },
              { id: 'm3', athlete1Id: '202505', athlete2Id: '202506', score1: 10, score2: 10, winnerId: '202505' },
              { id: 'm4', athlete1Id: '202507', athlete2Id: '202508', score1: 7, score2: 4, winnerId: '202507' },
            ],
          },
          {
            name: 'Semifinal',
            matches: [
              { id: 'm5', athlete1Id: '202501', athlete2Id: '202504', score1: 12, score2: 10, winnerId: '202501' },
              { id: 'm6', athlete1Id: '202505', athlete2Id: '202507', score1: 8, score2: 9, winnerId: '202507' },
            ],
          },
          {
            name: 'Final',
            matches: [
              { id: 'm7', athlete1Id: '202501', athlete2Id: '202507', score1: 15, score2: 12, winnerId: '202501' },
            ],
          },
        ],
        getAthlete: (id: string) => {
            const athleteIdNum = parseInt(id, 10);
            const found = athletes.find(a => a.id === athleteIdNum);
            if (found) return `${found.nombres} ${found.apellidos}`;
            switch(id) {
                case '202505': return 'Luis Martínez';
                case '202506': return 'Mariana Pinto';
                case '202507': return 'Diego Suárez';
                case '202508': return 'Camila López';
                default: return 'Desconocido';
            }
        },
      },
      'evt-004-senior-light-contact': {
        category: 'Senior',
        modality: 'Kickboxing - Light Contact',
        rounds: [
          {
            name: 'Semifinal',
            matches: [
              { id: 'lc1', athlete1Id: '202509', athlete2Id: '202510', score1: 22, score2: 18, winnerId: '202509' },
              { id: 'lc2', athlete1Id: '202511', athlete2Id: '202512', score1: 15, score2: 25, winnerId: '202512' },
            ],
          },
          {
            name: 'Final',
            matches: [
              { id: 'lc3', athlete1Id: '202509', athlete2Id: '202512', score1: 30, score2: 28, winnerId: '202509' },
            ],
          },
        ],
        getAthlete: (id: string) => {
            const athleteIdNum = parseInt(id, 10);
            const found = athletes.find(a => a.id === athleteIdNum);
            if (found) return `${found.nombres} ${found.apellidos}`;
            switch(id) {
                case '202509': return 'Javier Rivas';
                case '202510': return 'Paula Acosta';
                case '202511': return 'Miguel Gil';
                case '202512': return 'Daniela Soto';
                default: return 'Desconocido';
            }
        },
      },
       'evt-004-senior-full-contact': {
        category: 'Senior',
        modality: 'Kickboxing - Full Contact',
        rounds: [
          {
            name: 'Final',
            matches: [
              { id: 'fc1', athlete1Id: '202513', athlete2Id: '202514', score1: 5, score2: 4, winnerId: '202513' },
            ],
          },
        ],
        getAthlete: (id: string) => {
            const athleteIdNum = parseInt(id, 10);
            const found = athletes.find(a => a.id === athleteIdNum);
            if (found) return `${found.nombres} ${found.apellidos}`;
             switch(id) {
                case '202513': return 'Alejandro Mendoza';
                case '202514': return 'Isabella Torres';
                default: return 'Desconocido';
            }
        },
      },
      matchEvents: {
          'm7': [
              { timestamp: '00:15', player: 'red', event: 'Yuko (1 P)', scoreRed: 1, scoreBlue: 0 },
              { timestamp: '00:32', player: 'blue', event: 'Waza-Ari (2 P)', scoreRed: 1, scoreBlue: 2 },
              { timestamp: '00:45', player: 'red', event: 'Ippon (3 P)', scoreRed: 4, scoreBlue: 2 },
              { timestamp: '01:05', player: 'red', event: 'Falta (C1)', scoreRed: 4, scoreBlue: 2 },
              { timestamp: '01:18', player: 'blue', event: 'Yuko (1 P)', scoreRed: 4, scoreBlue: 3 },
              { timestamp: '01:30', player: 'red', event: 'Waza-Ari (2 P)', scoreRed: 6, scoreBlue: 3 },
              { timestamp: '01:45', player: 'blue', event: 'Falta (C2)', scoreRed: 6, scoreBlue: 3 },
          ]
      }
    };
