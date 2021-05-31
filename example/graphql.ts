
import {gql} from "@apollo/client"
const query = gql`query Search($first:Int=20, $after:String ) { 
    search(first:$first, after:$after,query: "virtualize", type:REPOSITORY){
      repositoryCount
      pageInfo{
        hasNextPage
        endCursor
      }
      nodes{      
        ...RepoInfo
      }
    }
  }
  
  fragment RepoInfo on RepositoryInfo{  
    nameWithOwner
    description
    forkCount
    owner{
      id
      login
    }
  }`;

  export default query;