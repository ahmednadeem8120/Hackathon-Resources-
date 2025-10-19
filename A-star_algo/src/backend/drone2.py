import sys
import math
from queue import PriorityQueue
from flask import Flask, request, jsonify
from flask_cors import CORS
import json

class Node():
    def __init__(self, state, parent, action, g=0, h=0):
        self.state = state
        self.parent = parent
        self.action = action
        self.g = g  # Cost from start to this node
        self.h = h  # Heuristic cost to goal

    @property
    def f(self):
        return self.g + self.h  # Total cost


class Maze():

    def __init__(self, filename):

        # Read file and set height and width of maze
        with open(filename) as f:
            contents = f.read()

        # Validate start and goal
        if contents.count("A") != 1:
            raise Exception("maze must have exactly one start point")
        if contents.count("B") != 1:
            raise Exception("maze must have exactly one goal")

        # Determine height and width of maze
        contents = contents.splitlines()
        self.height = len(contents)
        self.width = max(len(line) for line in contents)

        # Keep track of walls
        self.walls = []
        for i in range(self.height):
            row = []
            for j in range(self.width):
                try:
                    if contents[i][j] == "A":
                        self.start = (i, j)
                        row.append(False)
                    elif contents[i][j] == "B":
                        self.goal = (i, j)
                        row.append(False)
                    elif contents[i][j] == " ":
                        row.append(False)
                    else:
                        row.append(True)
                except IndexError:
                    row.append(False)
            self.walls.append(row)

        self.solution = None


    def print(self):
        solution = self.solution[1] if self.solution is not None else None
        print()
        for i, row in enumerate(self.walls):
            for j, col in enumerate(row):
                if col:
                    print("█", end="")
                elif (i, j) == self.start:
                    print("A", end="")
                elif (i, j) == self.goal:
                    print("B", end="")
                elif solution is not None and (i, j) in solution:
                    print("*", end="")
                else:
                    print(" ", end="")
            print()
        print()


    def neighbors(self, state):
        row, col = state
        candidates = [
            ("up", (row - 1, col)),
            ("down", (row + 1, col)),
            ("left", (row, col - 1)),
            ("right", (row, col + 1))
        ]

        result = []
        for action, (r, c) in candidates:
            if 0 <= r < self.height and 0 <= c < self.width and not self.walls[r][c]:
                result.append((action, (r, c)))
        return result


    def heuristic(self, a, b):
        # Euclidean distance heuristic
        (x1, y1) = a
        (x2, y2) = b
        return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)


    def solve(self):
        """Finds a solution to maze using A* algorithm."""

        self.num_explored = 0
        start_node = Node(state=self.start, parent=None, action=None, g=0, h=self.heuristic(self.start, self.goal))

        # Priority queue (min-heap)
        frontier = PriorityQueue()
        frontier.put((start_node.f, start_node))
        explored = set()

        while not frontier.empty():
            _, node = frontier.get()
            self.num_explored += 1

            # Goal check
            if node.state == self.goal:
                actions = []
                cells = []
                while node.parent is not None:
                    actions.append(node.action)
                    cells.append(node.state)
                    node = node.parent
                actions.reverse()
                cells.reverse()
                self.solution = (actions, cells)
                return

            explored.add(node.state)

            # Explore neighbors
            for action, state in self.neighbors(node.state):
                g = node.g + 1  # assume uniform step cost
                h = self.heuristic(state, self.goal)
                child = Node(state=state, parent=node, action=action, g=g, h=h)

                # If already explored with a lower cost, skip
                if state in explored:
                    continue

                # Add to frontier
                frontier.put((child.f, child))

        raise Exception("no solution found")


    def output_image(self, filename, show_solution=True, show_explored=False):
        from PIL import Image, ImageDraw
        cell_size = 50
        cell_border = 2

        # Create a blank canvas
        img = Image.new(
            "RGBA",
            (self.width * cell_size, self.height * cell_size),
            "black"
        )
        draw = ImageDraw.Draw(img)

        solution = self.solution[1] if self.solution is not None else None
        for i, row in enumerate(self.walls):
            for j, col in enumerate(row):
                # Walls
                if col:
                    fill = (40, 40, 40)

                # Start
                elif (i, j) == self.start:
                    fill = (255, 0, 0)

                # Goal
                elif (i, j) == self.goal:
                    fill = (0, 171, 28)

                # Solution
                elif solution is not None and show_solution and (i, j) in solution:
                    fill = (220, 235, 113)

                # Empty cell
                else:
                    fill = (237, 240, 252)

                draw.rectangle(
                    ([(j * cell_size + cell_border, i * cell_size + cell_border),
                      ((j + 1) * cell_size - cell_border, (i + 1) * cell_size - cell_border)]),
                    fill=fill
                )

        img.save(filename)


if len(sys.argv) != 2:
    sys.exit("Usage: python maze.py maze.txt")

m = Maze(sys.argv[1])
print("Maze:")
m.print()
print("Solving using A*...")
m.solve()
print("States Explored:", m.num_explored)
print("Solution:")
m.print()
m.output_image("maze_astar.png", show_explored=True)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

@app.route('/solve', methods=['POST'])
def solve_maze():
    try:
        data = request.json
        maze_content = data['maze_content']
        
        # Save to temporary file
        with open('temp_maze.txt', 'w') as f:
            f.write(maze_content)
        
        # Solve the maze
        m = Maze('temp_maze.txt')
        m.solve()
        
        # Return results as JSON
        return jsonify({
            'success': True,
            'explored': m.num_explored,
            'solution': m.solution[1] if m.solution else [],
            'walls': m.walls,
            'start': m.start,
            'goal': m.goal,
            'height': m.height,
            'width': m.width
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)