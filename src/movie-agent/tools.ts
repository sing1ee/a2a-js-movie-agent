import { registerTool, type ToolDefinition } from "./openai.js";
import { callTmdbApi } from "./tmdb.js";

// search movies tool implementation
async function searchMoviesImpl({ query }: { query: string }) {
  console.log("[tmdb:searchMovies]", JSON.stringify(query));
  try {
    const data = await callTmdbApi("movie", query);

    // Only modify image paths to be full URLs
    const results = data.results.map((movie: any) => {
      if (movie.poster_path) {
        movie.poster_path = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
      }
      if (movie.backdrop_path) {
        movie.backdrop_path = `https://image.tmdb.org/t/p/w500${movie.backdrop_path}`;
      }
      return movie;
    });

    return {
      ...data,
      results,
    };
  } catch (error) {
    console.error("Error searching movies:", error);
    throw error;
  }
}

// search people tool implementation
async function searchPeopleImpl({ query }: { query: string }) {
  console.log("[tmdb:searchPeople]", JSON.stringify(query));
  try {
    const data = await callTmdbApi("person", query);

    // Only modify image paths to be full URLs
    const results = data.results.map((person: any) => {
      if (person.profile_path) {
        person.profile_path = `https://image.tmdb.org/t/p/w500${person.profile_path}`;
      }

      // Also modify poster paths in known_for works
      if (person.known_for && Array.isArray(person.known_for)) {
        person.known_for = person.known_for.map((work: any) => {
          if (work.poster_path) {
            work.poster_path = `https://image.tmdb.org/t/p/w500${work.poster_path}`;
          }
          if (work.backdrop_path) {
            work.backdrop_path = `https://image.tmdb.org/t/p/w500${work.backdrop_path}`;
          }
          return work;
        });
      }

      return person;
    });

    return {
      ...data,
      results,
    };
  } catch (error) {
    console.error("Error searching people:", error);
    throw error;
  }
}

// register tool functions
registerTool("searchMovies", searchMoviesImpl);
registerTool("searchPeople", searchPeopleImpl);

// export tool definition to openai
export const searchMoviesTool: ToolDefinition = {
  type: "function",
  function: {
    name: "searchMovies",
    description: "search TMDB for movies by title",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The movie title to search for"
        }
      },
      required: ["query"]
    }
  }
};

export const searchPeopleTool: ToolDefinition = {
  type: "function",
  function: {
    name: "searchPeople",
    description: "search TMDB for people by name",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The person's name to search for"
        }
      },
      required: ["query"]
    }
  }
};

// export all tools
export const allTools: ToolDefinition[] = [searchMoviesTool, searchPeopleTool];
