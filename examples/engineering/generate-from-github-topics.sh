#!/usr/bin/env

#gh api graphql -f query='query($cursor:String){search(query:"is:public",type:REPOSITORY,first:100,after:$cursor){repositoryCount pageInfo{endCursor hasNextPage} nodes{repositoryTopics(first:10){nodes{topic{name stargazerCount}}}}}}' | jq -c '.data.search.nodes[].repositoryTopics.nodes[].topic | select(.stargazerCount >= 250) | {name, repoCount: .stargazerCount}' | jq -s '{topics: .}'

# Fetch topics and create filesystem
#topics=$(gh api graphql -f query='query($cursor:String){search(query:"is:public",type:REPOSITORY,first:100,after:$cursor){repositoryCount pageInfo{endCursor hasNextPage} nodes{repositoryTopics(first:10){nodes{topic{name stargazerCount}}}}}}' | jq -c '.data.search.nodes[].repositoryTopics.nodes[].topic | select(.stargazerCount >= 250) | {name, repoCount: .stargazerCount}' | jq -s '{topics: .}')

topics=$(gh api graphql -f query='
query($cursor:String) {
  search(query:"is:public", type:REPOSITORY, first:100, after:$cursor) {
    repositoryCount
    pageInfo {
      endCursor
      hasNextPage
    }
    nodes {
      ... on Repository {
        repositoryTopics(first:10) {
          nodes {
            topic {
              name
              stargazerCount
            }
          }
        }
      }
    }
  }
}' | jq -c '
  .data.search.nodes[]
  | select(.repositoryTopics != null) 
  | .repositoryTopics.nodes[]
  | select(.topic.stargazerCount >= 250)
  | {name: .topic.name, repoCount: .topic.stargazerCount}
' | jq -s '{topics: .}')



m="/mnt/anthropic/topics"
mkdir -p $m

c(){
    local topic=$(echo "$1" | sed 's/[^a-zA-Z0-9-]/_/g' | tr '[:upper:]' '[:lower:]')
    mkdir -p "$m/$topic"
    echo "$3" > "$m/$topic/$2"
}

echo "$topics" | jq -c '.topics[]' | while read -r topic; do
    name=$(echo "$topic" | jq -r '.name')
    count=$(echo "$topic" | jq -r '.repoCount')
    
    c "$name" "overview.txt" "Topic: $name
Repositories: $count
Description: Automated topic exploration
Key Insights:
1. Trend analysis
2. Community patterns
3. Technology landscape
4. Ecosystem mapping
5. Innovation tracking"

    c "$name" "examples.txt" "Sample Use Cases:
1. Research
2. Technology comparison
3. Trend identification
4. Community insights
5. Potential collaborations"

    c "$name" "resources.txt" "Recommended Resources:
1. Top repositories
2. Key contributors
3. Related technologies
4. Learning paths
5. Community forums"
done
