// 参考自 https://observablehq.com/@d3/stacked-to-grouped-bars

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 0;
const marginRight = 0;
const marginBottom = 10;
const marginLeft = 0;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 主要使用 d3-selection 模块的 API
// 具体可以参考 https://github.com/d3/d3-selection 或 https://d3js.org/d3-selection
// 使用方法 d3.create("svg") 创建一个 svg 元素，并返回一个选择集 selection
// 使用选择集的方法 selection.attr() 为选择集中的所有元素（即 <svg> 元素）设置宽高和 viewBox 属性
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 生成（随机）数据
 *
 */
// 该函数可以产生 m 个随机数（伪随机），它们是平滑变化的非负数
// 受到 Lee Byron 用于生成的测试数据的方法的启发，参考 http://leebyron.com/streamgraph/
function bumps(m) {
  const values = [];
  // 先在 [0.1, 0.2) 范围内，生成 m 个符合均匀分布的随机数
  for (let i = 0; i < m; ++i) {
    // 调用 JS 原生方法 Math.random() 可生成 [0, 1) 之间的随机数（符合均匀分布 uniform distribution）
    values[i] = 0.1 + 0.1 * Math.random();
  }

  // 对上面生成的 m 个未知数进行 5 次随机跳跃 random bumps 处理
  for (let j = 0; j < 5; ++j) {
    const x = 1 / (0.1 + Math.random());
    const y = 2 * Math.random() - 0.5;
    const z = 10 / (0.1 + Math.random());
    for (let i = 0; i < m; i++) {
      const w = (i / m - y) * z;
      values[i] += x * Math.exp(-w * w);
    }
  }

  // 确保所有随机数都是非负数
  for (let i = 0; i < m; ++i) {
    // 遍历 m 个随机数，对它们的取值进行约束 Math.max(0, values[i])
    values[i] = Math.max(0, values[i]);
  }

  return values;
}

// 有 5 个系列 series
// 对于堆叠条形图，是指每个条带由 5 层小矩形堆叠而成
// 对于分组条形图，是指每个分组中都包含 5 个条带
const n = 5

// 每个系列都有 58 个元素
// 对于堆叠条形图，是指共有 58 个条带
// 对于分组条形图，共有 58 个分组
const m = 58

// 生成数据（一个嵌套数组）
// 5 个元素（分组），每个元素（嵌套数组）包含 58 个数据点
const yz = d3.range(n).map(() => bumps(m)) // the y-values of each of the n series

console.log(yz);

// 生成一个数组，其元素是从 0 到 58 ，步长为 1 的等差数列
// 作为横坐标轴的值（相对应地条形图的 58 个条带也是采用数字来命名）
const xz = d3.range(m) // the x-values shared by all series

/**
 *
 * 处理数据
 *
 */
// 通过堆叠生成器对数据进行转换，用于后续绘制堆叠条形图和分组条形图
// 返回一个数组，每一个元素都是一个系列（条形图中每个条带就是由多个系列堆叠而成的）
// 而每一个元素（系列）也是一个数组，其中每个元素是该系列在条形图的每个条带中的相应值，例如在本示例中每个系列会有 58 个数据点
// 具体可以参考官方文档 https://d3js.org/d3-shape/stack 或 https://github.com/d3/d3-shape/blob/main/README.md#stacks
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
// 💡 虽然由堆叠生成器所生成的数据（并经过一些额外的处理）是为了更方便地绘制堆叠图
// 💡 但是其数据结构对于堆叠条形图和分组条形图都是通用的，由于绘制这两类图表所需要的数据结构都是一个嵌套数组
const y01z = d3.stack()
  // 设置系列的名称（数组）
  // 这里通过 d3.range(n) 来生成一个数组，其元素是从 0 到 n（n 为 5），步长为 1 的等差数列
  .keys(d3.range(n)) // D3 为每一个系列都设置了一个属性 key，其值是系列名称
  // 调用堆叠生成器，传入数据
  // 这里使用的数据并不是 yz 而是经过 d3.transpose() 进行处理
  // 由于 yz 是一个嵌套数组，外层是系列（共 5 个），每个系列（里层）分别有 58 个数据点
  // 即 yz 是按系列分好类的，这并不符合调用堆叠生成器时的数据格式要求
  // 在调用堆叠生成器时，需要传递一个数组，而每个元素需要是一个数据点（一条数据记录），即它需要包含了多个系列的数据
  // 然后 D3 根据系列的不同名称 key，从每个数据点中提取出相应系列的数据
  // 所以这里需要使用 d3.transpose() 「转置」 yz 数据
  // 参考官方文档 https://d3js.org/d3-array/transform#transpose 或 https://github.com/d3/d3-array/tree/v3.2.4#transpose
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process
  // 转置的作用是把矩阵的「行」和相应的「列」对换
  // 所以对于嵌套数组，就相当于把外层和内层调换
  // 所得到的数组变成了包含 58 个元素（相当于二维表格的一条条数据记录），每个元素也是一个数组，其中有 5 个数据点（即每一条数据记录都有 5 个系列的数据）
  (d3.transpose(yz))
  // 最后对于堆叠生成器所返回的数组（嵌套数组）进行遍历，对具体的数据点进行处理
  // 其中 data 是当前所遍历的元素（共有 5 个元素），它是一个系列的数据（也是一个数组）
  // 而 i 是当前所遍历的元素的索引值（在该示例中相当于系列的名称）
  // 然后在回调函数中对 data（嵌套数组）进行遍历，这些元素是该系列的数据点，每个元素分别对应于不同条带的该堆叠层的值，所以有 58 个元素
  // data 数组的元素是一个二元数组 [y0, y1]（这里通过解构来获取），它对应于堆叠的下边界和上边界
  // 然后返回一个三元数组，相当于为每个数据点添加了其所属系列 i
  .map((data, i) => data.map(([y0, y1]) => [y0, y1, i]));

console.log(y01z);

/**
 *
 * 构建比例尺
 *
 */
// 获取最值（用于纵坐标轴上）
// 获取 yz（一个嵌套数组）数据中的最大值
// 💡 yz 是原始数据，所以 yMax 是所有原始数据点中的最大值
// yMax 用于分组条形图的纵坐标轴比例尺中
const yMax = d3.max(yz, y => d3.max(y));

// 获取 y01z（一个嵌套数组）数据中的最大值
// 💡在遍历内层数据时，判断最值只获取二元数组的第二个元素 d[1] 因为它是堆叠的上边界，最值只会出现在这里
// 💡 y01Z 是经过堆叠处理的数据，所以 y1Max 是堆叠后的小矩形的（上边界）最大值，即堆叠条形图中最长的条带的 y 值
// y1Max 用于堆叠条形图的纵坐标轴比例尺中
const y1Max = d3.max(y01z, y => d3.max(y, d => d[1]));

// 设置横坐标轴的比例尺
// 横坐标轴的数据是条形图的各种分类，使用 d3.scaleBand 构建一个带状比例尺
// 使用 d3-scale 模块
// 具体参考官方文档 https://d3js.org/d3-scale/band 或 https://github.com/d3/d3-scale#scaleBand
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
const x = d3.scaleBand()
  // 设置定义域，使用 xz 数组（通过一个等差数列来表示 58 个分类）
  .domain(xz)
  // 设置值域范围（所映射的可视元素， svg 元素的宽度减去留白区域）
  // 使用 scale.rangeRound() 方法，可以进行修约，以便实现整数（类别）映射到整数（像素）
  .rangeRound([marginLeft, width - marginRight])
  .padding(0.08); // 并设置间隔占据（条带）区间的比例

// 设置纵坐标轴的比例尺
// 纵坐标轴的数据是连续型的数值（随机生成的数据），使用 d3.scaleLinear 构建一个线性比例尺
// 具体参考官方文档 https://d3js.org/d3-scale/linear 或 https://github.com/d3/d3-scale/tree/main#linear-scales
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
const y = d3.scaleLinear()
  // 设置定义域范围
  // 其中 y1Max 是经过堆叠处理的数据里（上边界）的最大值
  // 所以初始化的纵坐标轴是针对**堆叠条形图**的
  .domain([0, y1Max])
  // 设置值域范围（所映射的可视元素）
  // svg 元素的高度（减去留白区域）
  .range([height - marginBottom, marginTop]);

// 设置颜色比例尺
// 为不同系列设置不同的配色
// 使用 d3.scaleSequential 构建一个顺序比例尺 Sequential Scales 将连续型的定义域映射到连续型的值域
// 它和线性比例尺类似，但是它的配置方式并不相同，通过会指定一个插值器 interpolator 作为值域
// 具体参考官方文档 https://d3js.org/d3-scale/sequential 或 https://github.com/d3/d3-scale/tree/main#sequential-scales
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#顺序比例尺-sequential-scales
// 以下创建顺序比例尺时，同时设置了插值器（值域）
// 它是一个 D3 的内置配色方案 d3.interpolateBlues 可以从连续型的蓝色中进行颜色「采样」
// 具体可以查看 https://d3js.org/d3-scale-chromatic/sequential#interpolateBlues
const color = d3.scaleSequential(d3.interpolateBlues)
  // 设置定义域范围
  // ⚠️ 这里并不是直接将 [0, n] （n 为系列的数量）设置为颜色比例尺的定义域
  // 因为 d3.interpolateBlues 插值器所对应的色谱，开始于**接近白色的浅蓝色**
  // 如果将颜色比例尺的定义域范围设置 [0, n] 即与系列/类别的编码一致
  // 那么堆叠条形图的第一层（或分组条形图的每个组中的第一条条带）的颜色就会映射到色谱的最开始的颜色（浅蓝色）
  // 会影响可视性
  // 所以这里在设置颜色比例尺的定义域范围时，将 [0, n] 扩展为 [-0.5 * n, 1.5 * n]
  // 相当于「采样」色谱靠近中间的颜色，则开始的系列所对应的颜色会更易于阅读
  .domain([-0.5 * n, 1.5 * n]);
  // ❓ 这里不像其他堆叠条形的官方样例那样使用 d3.scaleOrdinal() 排序比例尺构建颜色比例尺，是为了兼容更多的场景
  // 因为排序比例尺一般与**离散型的配色方案**一起使用，但是这类配色方案的可选颜色值的数量是有限的
  // 实际上这类配色方案是预设了一些的颜色值，以数组的形式来存储
  // 一般针对用于数据已知的场景，可以确保可选的颜色值与类别数量一一匹配
  // 但是在该例子中，数据的系列/类别是变量 n，是可变更的，所以选择**连续型的配色方案**更合适
  // 连续型的配色方案实际上是一个插值器（函数），通过传入参数再计算得到相应的颜色值
  // 理论上可以从连续的色谱中「采样」得到无数的颜色值
  // 另外，连续型配色方案可以按需从中进行「采用」，作为离散型配色方案使用，例如 d3.schemeBlues[9]
  // 参考官方文档关于配色方案的部分 https://d3js.org/d3-scale-chromatic

/**
 *
 * 绘制坐标轴
 * 该示例只有横坐标轴
 * 由于纵坐标轴的定义域在切换不同类型的条形图时会发生变更，假如在图中有纵坐标轴则需要同步更新
 *
 */
// 绘制横坐标轴
svg.append("g")
  // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
  .attr("transform", `translate(0,${height - marginBottom})`)
  // 横轴是一个刻度值朝下的坐标轴
  // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
  // 使用方法 axis.tickFormat(format) 设置刻度值格式，其中 format 是格式化函数
  // 在这里采用自定义的格式化函数，表示无论入参值（刻度的默认值）是什么都返回空字符串（在视觉上不可见）
  // 其作用相当于取消坐标轴的刻度值（只显示刻度线）
  // 💡 注意这里使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  .call(d3.axisBottom(x).tickSizeOuter(0).tickFormat(() => ""));

/**
 *
 * 绘制条形图内的柱子
 * 初始化的图表是堆叠条形图
 *
 */
// 绘制堆叠条形图（或分组条形图）的步骤与一般的条形图会有所不同
// 因为普通的条形图每一个条带都只是有一个矩形构成
// 而堆叠条形图的每一个条带是由多个小的矩形依次堆叠而成的（分组条形图则是每一组都包含多个条带）
// 相应地，所绑定/对应的数据结构也不同
// 普通的条形图所绑定的数据是一个数组，而堆叠条形图（或分组条形图）所绑定的数据是一个嵌套数组
// 而且由于进行需要进行「分步绘制」，所以需要进行数据「二次绑定」（读取嵌套的数组）
const rect = svg.append("g") // ⚠️ 这里的代码和官方样例不同，先创建一个 <g>
  // 这个 <g> 作为大容器，包裹所有系列容器 <g> 的父容器
  // 因为在复现是先绘制了坐标轴，使得 <svg> 中包含了 <g> 元素，所以如果直接调用 svg.selectAll("g") 会选中坐标轴的元素
  // 这里新建一个大容器，再在其中绘制条形图
  .selectAll("g") // 返回一个选择集，其中虚拟/占位元素是 <g> 它们作为各系列的容器
  // 绑定数据，每个容器 <g> 对应一个系列数据
  // ⚠️ 所绑定的数据 y01z 是由堆叠生成器所生成的数据（并经过一些额外的处理）
  // ⚠️ 所以在绘制分组条形图时，需要进行一些额外的计算，转换为合适的值
  .data(y01z)
  .join("g")
    // 设置颜色，不同系列/堆叠层对应不同的颜色
    // 颜色比例尺 color 根据数据的索引值 i 进行映射，得到相应的颜色值
    .attr("fill", (d, i) => color(i))
  // 使用 <rect> 元素为每一堆叠层绘制出一系列的小矩形
  .selectAll("rect")
  // 返回的选择集是由多个分组（各个 <g> 容器中）的虚拟/占位 <rect> 元素构成的
  // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
  // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
  // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
  // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
  // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
  // 每一个分组都会调用该方法，并依次传入三个参数：
  // * 当前所遍历的分组的父节点所绑定的数据 datum
  // * 当前所遍历的分组的索引 index
  // * 选择集的所有父节点 parent nodes
  // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
  // 所以入参 d 是一个堆叠系列的数据（即 y01z 的一个嵌套数组）
  // 每个元素是一个三元数组，第一个元素是堆叠小矩阵的下边界；第二个元素是上边界；第三个元素是所属系列（用一个数字表示）
  // 这个函数的作用是直接返回数据（数组）本身，让每个 <rect> 元素绑定一个数据点
  .data(d => d)
  .join("rect") // 将元素绘制到页面上
    // 为每个小矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    // 每个矩形的左上角横轴定位 x 由它的索引值 i 所决定
    // 通过横坐标轴比例尺 x(i) 进行映射，求出具体的横轴坐标值
    .attr("x", (d, i) => x(i))
    // 每个矩形的左上角纵轴定位 y 的初始值设置为条形图的底部（与横坐标轴的位置高度一致）
    .attr("y", height - marginBottom)
    // 每个矩形的宽度
    // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("width", x.bandwidth())
    // 每个矩形的高度，初始值为 0
    // ⛔ 所以这些堆叠小矩形一开始是不可见的
    .attr("height", 0);

/**
 *
 * 堆叠条形图和分组条形图之间的切换
 *
 */
// 调用以下方法转换为分组条形图
function transitionGrouped() {
  // 更改纵坐标轴比例尺的定义域
  // 将定义域的上限（从 y1Max）改为 yMax，它是所有原始数据点中的最大值
  y.domain([0, yMax]);

  // 为更改（矩形）图形元素的一些属性添加过渡动效，以便利用物体恒存 object constancy 让用户追踪条带（各部分）的变化
  // 通过 selection.transition() 创建过渡管理器（在以下代码中 rect 变量就是条形图中包含所有 <rect> 元素的选择集）
  // 过渡管理器和选择集类似，有相似的方法，例如为选中的 DOM 元素设置样式属性
  // 使用 d3-transition 模块
  // 具体参考官方文档 https://d3js.org/d3-transition 或 https://github.com/d3/d3-transition
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-transition
  rect.transition()
    .duration(500) // 过渡时长为 500ms
    // 设置过渡的延迟启动时间，单位是毫秒 ms
    // 延迟时间是动态的（即不是固定值，每个元素的过渡延迟时间都不同，根据其索引值 i 计算得到）
    // 相邻元素之间相差 20ms，从视觉上来看就会是条形图的各个条带**从左往右**依次开始进行变换（而不是统一开始）
    .delay((d, i) => i * 20)
    // 设置条带 <rect> 元素的的左上角在横轴的定位 x（过渡的目标值/最终值）
    // 由于转换到分组条形图，所以每个矩形（条带）在横轴上的定位与两个值相关：
    // * 该条带所属的组别（大类），在该示例中以 0 到 57 的数字来表示类别，正好和元素（在选择集分组中的）索引值 i 相对应
    // * 该条带在该组的区间中的次序，由它所属的系列（子类）决定，可以通过所绑定数据（一个三元数组）的第三个元素获取，即以下代码中的 d[2]
    // 而横坐标比例尺 x 是将 58 个类别（类别以数字表示，从 0 到 57）映射到 svg 元素的宽度
    // 所以通过横坐标轴比例尺 x(i) 进行映射，可以得到相应组别（大类）在横坐标上的位置
    // 由于 x.bandwidth 是每个分组区间的宽度，则 x.bandwidth() / n 就是每个条带的宽度
    // 再通过计算 x.bandwidth() / n * d[2] 可以知道该条带在该组区间中的位置
    .attr("x", (d, i) => x(i) + x.bandwidth() / n * d[2])
    // 设置每个条带的宽度（过渡的目标值/最终值）
    .attr("width", x.bandwidth() / n)
    // 💡 这里通过 transition.transition() 基于原有的过渡管理器所绑定的选择集合，创建一个新的过渡管理器
    // 💡 新的过渡管理器会**继承了原有过渡的名称、时间、缓动函数等配置**
    // 💡 而且新的过渡会**在前一个过渡结束后开始执行**
    // 💡 一般通过该方法为同一个选择集合设置一系列**依次执行的过渡动效**
    // 前面的变更是条带的横坐标轴的定位和宽度
    // 接着下面的变更是条带的纵坐标轴的定位和高度
    // 所以从视觉上来看，条形图从左往右的条带依次先在横轴上发生变换，再在纵轴上发生变换
    .transition()
    // 设置条带 <rect> 元素的的左上角在纵轴的定位 y（过渡的目标值/最终值）
    // ⚠️ 由于元素所绑定的数据 d（一个三元数组）**适用于堆叠条形图**，而这里绘制的是分组条形图
    // ⚠️ 所以需要对数据进行计算转换，由于 d[1] 是堆叠的上边界，而 d[0] 是堆叠的下边界
    // ⚠️ 那么两者的差值 d[1] - d[0] 再通过比例尺 y 进行映射 y(d[1] - d[0]) 就是堆叠小矩形的高度
    // ⚠️ 由于前面已经更改纵坐标轴比例尺的定义域，所以这里 y(d[1] - d[0]) 的映射结果就是条带的高度
    // 正是需要将其作为 <rect> 元素的的左上角在纵轴的定位
    .attr("y", d => y(d[1] - d[0]))
    // 设置条带的高度（过渡的目标值/最终值）
    // ⚠️ 同样需要注意所绑定的数据 d（一个三元数组）是适用于堆叠条形图的
    // 由于 d[1] 是堆叠的上边界，该值并不是（分组条形图）条带所对应的数据
    // 需要作差 d[1] - d[0] 减去其堆叠的下边界，才「还原」出条带所对应的真实数据
    // 然后通过 y(0) - y(d[1] - d[0]) 计算出条带的高度
    // ⚠️ 应该特别留意纵坐标轴的值域（可视化属性，这里是长度）范围 [bottom, top]
    // 由于 svg 的坐标体系中向下和向右是正方向，和我们日常使用的不一致
    // 所以这里的值域范围需要采用从下往上与定义域进行映射
    .attr("height", d => y(0) - y(d[1] - d[0]));
}

// 调用以下方法转化为堆叠条形图
function transitionStacked() {
  // 更改纵坐标轴比例尺的定义域
  // 将定义域的上限（从 yMax）改为 y1Max，它是堆叠后的小矩形的（上边界）最大值，即堆叠条形图中最长的条带的 y 值
  y.domain([0, y1Max]);

  // 变换为堆叠条形图
  // 通过 selection.transition() 创建过渡管理器，为更改图形元素的一些属性添加过渡动效
  rect.transition()
    .duration(500) // 过渡时长为 500ms
    .delay((d, i) => i * 20) // 设置过渡的延迟启动时间，每个元素的延迟时间是动态计算得到的
    // 设置堆叠小矩形 <rect> 元素的的左上角在纵轴的定位 y（过渡的目标值/最终值）
    // 元素所绑定的数据 d（一个三元数组）中第二个元素 d[1] 是堆叠的上边界
    .attr("y", d => y(d[1]))
    // 设置小矩形的高度（过渡的目标值/最终值）
    // 由于 d[1] 是堆叠的上边界，而 d[0] 是堆叠的下边界
    // 那么两者的差值 d[1] - d[0] 再通过比例尺 y 进行映射 y(d[1] - d[0]) 就是堆叠小矩形的高度
    .attr("height", d => y(d[0]) - y(d[1]))
    // 通过 transition.transition() 基于原有的过渡管理器所绑定的选择集合，创建一个新的过渡管理器
    // 新的过渡会在前一个过渡结束后开始执行
    // 前面的变更是条带的纵坐标轴的定位和高度
    // 接着下面的变更是条带的横坐标轴的定位和宽度
    // 所以从视觉上来看，条形图从左往右的条带依次先在纵上发生变换，再在横轴上发生变换
    .transition()
    // 设置条带 <rect> 元素的的左上角在横轴的定位 x（过渡的目标值/最终值）
    // 由于转换到堆叠条形图，所以每个小矩形在横轴上的定位与它所属的条带相关
    // 在该示例中以 0 到 57 的数字来表示条带的名称，正好和元素（在选择集分组中的）索引值 i 相对应
    .attr("x", (d, i) => x(i))
    // 设置每个条带的宽度（过渡的目标值/最终值）
    // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("width", x.bandwidth());
}

/**
 *
 * 设置事件监听器，实现条形图类型的切换
 *
 */
const stackedDom = document.getElementById("stacked");

stackedDom.addEventListener('change', ()=> {
  console.log('change');
  if(stackedDom.checked) {
    console.log('change to stacked');
    transitionStacked()
  }
})

const groupedDom = document.getElementById("grouped");

groupedDom.addEventListener('change', ()=> {
  console.log('change');
  if (groupedDom.checked) {
    console.log('change to grouped');
    transitionGrouped()
  }
})

// 条形图的初始化类型为堆叠图
window.onload = () => {
  console.log('loaded');
  transitionStacked()
  stackedDom.checked=true;
}
