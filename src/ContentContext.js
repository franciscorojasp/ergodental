import React, { createContext, useState } from 'react';

export const ContentContext = createContext();

const content = {
  en: `
# Chris Gibbons
## London-based Staff Software Engineer
**Email**: [chris@cgibbons.com](mailto:chris@cgibbons.com) |
**GitHub**: [github.com/cgibbons](https://github.com/cgibbons) |
**Web**: [www.cgibbons.com](https://www.cgibbons.com) |
**LinkedIn**: [linkedin.com/in/cgibbons](https://linkedin.com/in/cgibbons)

---

## Summary

Engineer with over 10 years of experience, currently leading high-performing teams. Expert in building modern web and mobile applications with React, React Native, and Node.js on AWS. Proven track record of delivering high-quality software, mentoring peers, and improving engineering standards.

---

## Areas of Expertise

*   **Web/Mobile Engineering**: React, React Native, Next.js, GraphQL, TypeScript/JavaScript, CSS (Tailwind, CSS-in-JS).
*   **Back-end & Cloud**: Node.js, SQL, AWS (AWS Lambda, AppSync, DynamoDB, CDK), CI/CD (GitHub Actions, CircleCI).
*   **Engineering Leadership**: Technical leadership, strategy, systems architecture, team processes, and mentoring.

---

## Work Experience

### Staff Software Engineer — News UK
**Dates**: February 2021 – Present
**Key Tech Stack**: React, React Native, AWS (CDK, AppSync, Lambda, DynamoDB), Typescript

*   Lead the technical architecture and direction of News UK's mobile apps platform, hosting brands such as [The Sun](https://apps.apple.com/gb/app/the-sun-news-sport/id388147348) and [Talksport](https://apps.apple.com/gb/app/talksport-live-sports-radio/id341901174)
*   Mentor engineers across all levels, and advocate for a healthy, stable, high-performing team
*   Assisted with recruitment for the engineering team by running coding interviews and system design sessions
*   Designed a new content delivery architecture for the [The Sun app](https://apps.apple.com/gb/app/the-sun-news-sport/id388147348) by identifying current weaknesses and constraints
*   Established a new engineering documentation standard after noticing that key features lacked up-to-date documentation

### Senior Software Engineer - News UK
**Dates**: November 2017 – February 2021
**Key Tech Stack**: JavaScript (Node.js/React), Next.js, GraphqQL, AWS

*   Designed and built the main editorial web-app for News UK which powers The Sun, The Times, and Virgin Radio by working alongside our editorial staff
*   Helped lead a multi-disciplinary squad focused on modernizing the editorial experience and reducing publishing times for breaking news items
*   Improved and streamlined our publishing pipelines by optimizing our Node.js and CircleCI build processes
*   Helped rebrand several legacy News UK websites to the new News UK design system

### Senior UI Developer/Consultant — Capgemini
**Dates**: March 2017 – November 2017
**Key Tech Stack**: Javascript, AngularJS, Sass, Jasmine/Karma, Jenkins

*   Worked as embedded consultant and senior engineer on several projects within HMRC
*   Built and maintained several citizen-facing web apps used by millions of taxpayers

---

## Education

### BSc Computer Science, Loughborough University
**Dates**: September 2010 - June 2014
**Grade**: Upper Second-Class Honours (2:1)
**Placement Year**: Intern at Intel (July 2012 - August 2013)
**Key Modules**: Software Engineering, Multi-agent Systems, Networks, Game Development

### A-levels — Bishop Wordsworth’s Grammar School for Boys
**Dates**: September 2008 - June 2010
**Subjects**: ICT (A), Law (B), General Studies (A)

---

## References

Available upon request.
`,

  es: `
# Chris Gibbons
## Staff Software Engineer con sede en Londres
**Email**: [chris@cgibbons.com](mailto:chris@cgibbons.com) |
**GitHub**: [github.com/cgibbons](https://github.com/cgibbons) |
**Web**: [www.cgibbons.com](https://www.cgibbons.com) |
**LinkedIn**: [linkedin.com/in/cgibbons](https://linkedin.com/in/cgibbons)

---

## Resumen

Ingeniero con más de 10 años de experiencia, actualmente liderando equipos de alto rendimiento. Experto en construir aplicaciones web y móviles modernas con React, React Native y Node.js en AWS. Historial comprobado de entrega de software de alta calidad, mentoría de colegas y mejora de los estándares de ingeniería.

---

## Áreas de Experiencia

*   **Ingeniería Web/Móvil**: React, React Native, Next.js, GraphQL, TypeScript/JavaScript, CSS (Tailwind, CSS-in-JS).
*   **Back-end y Nube**: Node.js, SQL, AWS (AWS Lambda, AppSync, DynamoDB, CDK), CI/CD (GitHub Actions, CircleCI).
*   **Liderazgo de Ingeniería**: Liderazgo técnico, estrategia, arquitectura de sistemas, procesos de equipo y mentoría.

---

## Experiencia Laboral

### Staff Software Engineer — News UK
**Fechas**: Febrero 2021 – Actualidad
**Tecnologías Clave**: React, React Native, AWS (CDK, AppSync, Lambda, DynamoDB), Typescript

*   Lidero la arquitectura técnica y la dirección de la plataforma de aplicaciones móviles de News UK, que aloja marcas como [The Sun](https://apps.apple.com/gb/app/the-sun-news-sport/id388147348) y [Talksport](https://apps.apple.com/gb/app/talksport-live-sports-radio/id341901174)
*   Asesoro a ingenieros de todos los niveles, promoviendo por un equipo saludable, estable y de alto rendimiento
*   Ayudé con la selección de personal para el equipo de ingeniería mediante la realización de entrevistas de codificación y sesiones de diseño de sistemas
*   Diseñé una nueva arquitectura de entrega de contenido para la aplicación The Sun identificando las debilidades y limitaciones actuales
*   Establecí un nuevo estándar de documentación de ingeniería después de notar que las funciones clave carecían de documentación actualizada

### Senior Software Engineer - News UK
**Fechas**: Noviembre 2017 – Febrero 2021
**Tecnologías Clave**: JavaScript (Node.js/React), Next.js, GraphqQL, AWS

*   Diseñé y construí la principal aplicación web editorial de News UK que impulsa The Sun, The Times y Virgin Radio trabajando junto a nuestro personal editorial
*   Ayudé a liderar un escuadrón multidisciplinar centrado en modernizar la experiencia editorial y reducir los tiempos de publicación de noticias de última hora
*   Mejoré y simplifiqué nuestros flujos de publicación optimizando nuestros procesos de compilación Node.js y CircleCI
*   Ayudé a renovar la marca de varios sitios web heredados de News UK al nuevo sistema de diseño de News UK

### Senior UI Developer/Consultant — Capgemini
**Fechas**: Marzo 2017 – Noviembre 2017
**Tecnologías Clave**: Javascript, AngularJS, Sass, Jasmine/Karma, Jenkins

*   Trabajé como consultor integrado e ingeniero senior en varios proyectos dentro de la HMRC (Hacienda Británica)
*   Construí y mantuve varias aplicaciones web orientadas al ciudadano utilizadas por millones de contribuyentes

---

## Educación

### Grado en Ciencias de la Computación, Universidad de Loughborough
**Fechas**: Septiembre 2010 - Junio 2014
**Nota**: Matrícula de Honor (2:1)
**Año de prácticas**: Pasante en Intel (Julio 2012 - Agosto 2013)
**Módulos Clave**: Ingeniería de Software, Sistemas Multi-agente, Redes, Desarrollo de Videojuegos

### A-levels — Escuela Secundaria Bishop Wordsworth
**Fechas**: Septiembre 2008 - Junio 2010
**Asignaturas**: Tecnología de la Información (A), Derecho (B), Estudios Generales (A)

---

## Referencias

Disponibles bajo petición.
`,
};

export const ContentProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'es' : 'en'));
  };

  return (
    <ContentContext.Provider value={{ content: content[language], language, toggleLanguage }}>
      {children}
    </ContentContext.Provider>
  );
};
